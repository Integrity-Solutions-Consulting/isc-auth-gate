#!/usr/bin/env bash
# Preview por PR en Dokploy: app `auth-pr-<N>` + Postgres `auth-pr-<N>-db`
# propios en el environment `preview` del proyecto ISC AUTH.
#
#   preview.sh deploy  <pr> <sha>   crea (si falta) app + DB + dominio, copia el
#                                   env de la app de dev con URL/DB propias,
#                                   despliega :pr-<pr>-<sha> y espera el health
#   preview.sh destroy <pr>         borra app y DB (los datos del PR se pierden)
#
# Env: DOKPLOY_URL, DOKPLOY_API_KEY, PREVIEW_ENVIRONMENT_ID,
#      PREVIEW_TEMPLATE_APP_ID (app de dev cuyo env se hereda),
#      PREVIEW_DOMAIN (sufijo wildcard, p. ej. dokploy.example.com), IMAGE.
#
# Lo ejecutan workflows de `main` (workflow_run / pull_request_target): nunca
# corre código de la rama del PR, sólo despliega la imagen ya construida.
set -euo pipefail

cmd=${1:?deploy|destroy}
pr=${2:?pr number}
[[ "$pr" =~ ^[0-9]+$ ]] || { echo "PR inválido: $pr" >&2; exit 1; }

name="auth-pr-$pr"
db_name="$name-db"
host="$name.$PREVIEW_DOMAIN"

api() { # api GET path | api POST path json
  local method=$1 path=$2
  if [ "$method" = GET ]; then
    curl -fsS -H "x-api-key: $DOKPLOY_API_KEY" "$DOKPLOY_URL/api/$path"
  else
    curl -fsS -X POST -H "x-api-key: $DOKPLOY_API_KEY" \
      -H 'content-type: application/json' "$DOKPLOY_URL/api/$path" -d "$3"
  fi
}

environment() { api GET "environment.one?environmentId=$PREVIEW_ENVIRONMENT_ID"; }
app_id() { environment | jq -r --arg n "$name" '.applications[]|select(.name==$n)|.applicationId' | head -1; }
db_id() { environment | jq -r --arg n "$db_name" '.postgres[]|select(.name==$n)|.postgresId' | head -1; }

deploy() {
  local sha=${1:?sha}
  [[ "$sha" =~ ^[0-9a-f]{40}$ ]] || { echo "SHA inválido: $sha" >&2; exit 1; }

  local pg; pg=$(db_id)
  if [ -z "$pg" ]; then
    echo "Creando Postgres $db_name"
    api POST postgres.create "$(jq -n --arg n "$db_name" --arg e "$PREVIEW_ENVIRONMENT_ID" \
      --arg p "$(openssl rand -hex 24)" \
      '{name:$n, appName:$n, environmentId:$e, databaseName:"isc-auth",
        databaseUser:"isc-auth", databasePassword:$p, dockerImage:"postgres:18",
        description:"Preview del PR (se borra al cerrarlo)"}')" >/dev/null
    pg=$(db_id)
    api POST postgres.deploy "$(jq -n --arg id "$pg" '{postgresId:$id}')" >/dev/null
  fi
  local pg_json; pg_json=$(api GET "postgres.one?postgresId=$pg")

  local app; app=$(app_id)
  if [ -z "$app" ]; then
    echo "Creando app $name"
    api POST application.create "$(jq -n --arg n "$name" --arg e "$PREVIEW_ENVIRONMENT_ID" \
      '{name:$n, appName:$n, environmentId:$e, description:"Preview del PR (se borra al cerrarlo)"}')" >/dev/null
    app=$(app_id)
    api POST domain.create "$(jq -n --arg id "$app" --arg h "$host" \
      '{applicationId:$id, host:$h, path:"/", port:3000, https:true,
        certificateType:"letsencrypt", domainType:"application"}')" >/dev/null
  fi

  # Env de dev menos lo que es propio del preview (URL, DB, secret).
  # Secret propio: una sesión del preview no vale en dev y viceversa.
  local overrides="BETTER_AUTH_URL|NEXT_PUBLIC_BETTER_AUTH_URL|BETTER_AUTH_SERVER_TRUSTED_ORIGINS|BETTER_AUTH_SERVER_DOMAIN|BETTER_AUTH_SERVER_SECRET|BETTER_AUTH_DATABASE_[A-Z_]+"
  local env
  env=$(api GET "application.one?applicationId=$PREVIEW_TEMPLATE_APP_ID" | jq -r '.env // ""' \
    | grep -vE "^[[:space:]]*(#|$)" | grep -vE "^($overrides)=" || true)
  env+=$'\n'"$(jq -r --arg h "$host" --arg s "$(openssl rand -hex 32)" '
    "BETTER_AUTH_URL=https://\($h)/",
    "NEXT_PUBLIC_BETTER_AUTH_URL=https://\($h)",
    "BETTER_AUTH_SERVER_TRUSTED_ORIGINS=https://\($h)",
    "BETTER_AUTH_SERVER_SECRET=\($s)",
    "BETTER_AUTH_DATABASE_HOST=\(.appName)",
    "BETTER_AUTH_DATABASE_PORT=5432",
    "BETTER_AUTH_DATABASE_NAME=\(.databaseName)",
    "BETTER_AUTH_DATABASE_USER=\(.databaseUser)",
    "BETTER_AUTH_DATABASE_PASS=\(.databasePassword)",
    "BETTER_AUTH_DATABASE_SSL=false"' <<<"$pg_json")"

  # El secret se regenera sólo si la app no tenía uno: rotarlo en cada push
  # cerraría las sesiones abiertas del preview.
  local current_secret
  current_secret=$(api GET "application.one?applicationId=$app" | jq -r '.env // ""' \
    | grep -E "^BETTER_AUTH_SERVER_SECRET=" || true)
  if [ -n "$current_secret" ]; then
    env=$(grep -vE "^BETTER_AUTH_SERVER_SECRET=" <<<"$env")$'\n'"$current_secret"
  fi

  api POST application.saveEnvironment "$(jq -n --arg id "$app" --arg env "$env" \
    '{applicationId:$id, env:$env, buildArgs:"", buildSecrets:"", createEnvFile:false}')" >/dev/null

  api POST application.saveDockerProvider "$(jq -n --arg id "$app" --arg img "$IMAGE:pr-$pr-$sha" \
    '{applicationId:$id, dockerImage:$img, username:"", password:"", registryUrl:"ghcr.io"}')" >/dev/null

  api POST application.deploy "$(jq -n --arg id "$app" --arg t "PR #$pr @ ${sha:0:7}" \
    '{applicationId:$id, title:$t}')" >/dev/null

  # Igual que dev/prod: exige que responda ESTE commit, no sólo un 200.
  for i in $(seq 1 45); do
    version=$(curl -fsS "https://$host/api/health" | jq -r .version || true)
    if [ "$version" = "$sha" ]; then
      echo "Healthy ($version) after attempt $i"
      echo "url=https://$host" >>"${GITHUB_OUTPUT:-/dev/null}"
      return 0
    fi
    echo "Attempt $i: version '$version' != '$sha' — retry in 10s"
    sleep 10
  done
  echo "Health check failed: revisa los logs de $name en Dokploy (environment preview)" >&2
  return 1
}

destroy() {
  local app pg
  app=$(app_id); pg=$(db_id)
  [ -n "$app" ] && api POST application.delete "$(jq -n --arg id "$app" '{applicationId:$id}')" >/dev/null && echo "App $name borrada"
  [ -n "$pg" ] && api POST postgres.remove "$(jq -n --arg id "$pg" '{postgresId:$id}')" >/dev/null && echo "Postgres $db_name borrado"
  return 0
}

case $cmd in
  deploy) deploy "${3:-}" ;;
  destroy) destroy ;;
  *) echo "uso: $0 deploy <pr> <sha> | destroy <pr>" >&2; exit 1 ;;
esac
