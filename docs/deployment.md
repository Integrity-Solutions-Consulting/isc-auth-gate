# Deployment guide

Ambientes desplegados en **Dokploy** (Docker + Traefik). La imagen se construye
en GitHub Actions, se publíca en GHCR y Dokploy solo despliega (provider
**Image**). Cada ambiente es una aplicación Dokploy propia con su Postgres.

## CI/CD (GitHub Actions)

| Workflow | Trigger | Acción |
|---|---|---|
| `.github/workflows/ci-deploy-dev.yaml` | push a `main` | CI (abajo) → build & push `ghcr.io/yigsvnsla/isc-auth-gate:dev` (+ `:sha`) → deploy app dev → health check |
| `.github/workflows/deploy-prod.yaml` | manual (`workflow_dispatch`, input `rollback_sha` vacío) | idem, con build args prod, tags `prod`/`prod-<sha>` |
| `.github/workflows/deploy-prod.yaml` | manual, `rollback_sha=<sha completo>` | sin CI ni build: redespliega `:prod-<sha>` |

CI (job `ci`, postgres 17 efímero): `lint` → `drizzle-kit check` (historial) →
`drizzle-kit generate` + diff (schema.ts sin migración generada) →
`database:up` (todas las migraciones sobre DB limpia; nunca `push`) →
`database:check` (`SELECT 1` real) → tests.

Prod no reutiliza la imagen de dev: `NEXT_PUBLIC_BETTER_AUTH_URL` va
compilada en el bundle, así que cada ambiente tiene su build.

El health check post-deploy exige `version == SHA desplegado` en
`/api/health`, no sólo 200: si el contenedor nuevo muere migrando, el anterior
sigue respondiendo 200.

Contract con Dokploy:

```bash
bun x dokploy application save-docker-provider \
  --applicationId <id> --dockerImage ghcr.io/yigsvnsla/isc-auth-gate:<tag>
bun x dokploy application deploy --applicationId <id>
```

CLI autenticada con env `DOKPLOY_URL` + `DOKPLOY_API_KEY` (`@dokploy/cli`,
devDependency). Útil también manual:

```bash
bun x dokploy project all          # descubrir applicationId / environmentId
bun x dokploy application one --applicationId <id>
```

### Secrets GitHub (Settings → Secrets and variables → Actions)

| Secret | Origen |
|---|---|
| `DOKPLOY_URL` | `https://dokploy.integritysolutions.com.ec` |
| `DOKPLOY_API_KEY` | Dokploy → Profile → Generate API Key |
| `DOKPLOY_APP_ID_DEV` / `DOKPLOY_APP_ID_PROD` | applicationId de cada app |
| `NEXT_PUBLIC_BETTER_AUTH_URL_DEV` / `NEXT_PUBLIC_BETTER_AUTH_URL_PROD` | dominio sin `/` |
| `DOMAIN_DEV` / `DOMAIN_PROD` | dominio público, usado por el health check |

Tests en CI corren contra un postgres efímero (service container) con
`BETTER_AUTH_TEST_ALLOW_TRUNCATE=true` — nunca contra la db dev.

## Imagen

`.containers/Containerfile` en el repo, multi-stage. Es el único archivo de
build: ambos workflows lo referencian con `file: .containers/Containerfile`.

1. **install** — `bun install --frozen-lockfile` completo, y aparte
   `--production` en `/temp/prod`.
2. **prerelease** — `bun run build` con Next.js `output: "standalone"`, y copia
   `public` y `.next/static` dentro de `.next/standalone/`.
3. **runner** — copia solo `.next/standalone` + `node_modules` de producción +
   lo necesario para migrar (`database/`, `env/`, `tsconfig.json`,
   `entrypoint.ts`). Arranca con `sh -c "bun entrypoint.ts && exec bun
   server.js"`: el entrypoint valida el env, espera la DB y migra con
   `drizzle-orm/bun-sql/migrator` (drizzle-kit es devDependency y no está en la
   imagen). Sólo con exit 0 se hace `exec` de Next, que queda como PID 1.

## Build args

Dos, las pasa el workflow:

```env
NEXT_PUBLIC_BETTER_AUTH_URL=https://<dominio-ambiente>   # obligatoria
APP_VERSION=<commit sha>                                # /api/health.version
```

`APP_VERSION` es ARG sin ENV: `next.config.ts` la compila en el bundle del
servidor y no queda como variable de la imagen final.

`next build` la compila dentro del bundle del **cliente**
(`lib/auth/client/config/client.ts` la usa como `baseURL`), así que no hay forma de
moverla a runtime. Sin ella el bundle compila con `baseURL: undefined` y el
login desde el navegador falla aunque el servidor esté sano.

**No se pasan más build args.** Las vars de servidor no las necesita el build:
`env/server` omite la validación durante `next build` (`skipValidation` con
`NEXT_PHASE=phase-production-build`) y `lib/auth/server/config/server.ts` usa
placeholders, porque `lib/auth/server` y compañía leen env en el scope del módulo
y Next ejecuta esos módulos al recolectar datos de página. Un contenedor
arrancado sin env completo lo detecta `entrypoint.ts` y aborta.

## Environment (runtime) — Dokploy UI

Mismas variables que `.env.example`. Por ambiente:

| Var | Dev | Prod |
|---|---|---|
| `BETTER_AUTH_URL` | `https://<dev>/` | `https://<prod>/` |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | `https://<dev>` | `https://<prod>` |
| `BETTER_AUTH_SERVER_TRUSTED_ORIGINS` | dominios dev, comma-separated | dominios prod, comma-separated |
| `BETTER_AUTH_SERVER_SECRET` | secreto dev | secreto prod |
| `BETTER_AUTH_DATABASE_HOST` | host db dev | host db prod |
| `BETTER_AUTH_DATABASE_NAME` | `isc-auth-dev` | `isc-auth-prod` |
| `BETTER_AUTH_DATABASE_SSL` | `false` | `true` si requiere SSL |
| `BETTER_AUTH_SERVER_DEBUG` | opcional `true` | `false` |

Rate-limit compartido entre instancias (opcional): `REDIS_URL` +
`BETTER_AUTH_RATE_LIMIT_STORAGE=redis`. En single-instancia deja `memory`.

## Postgres

Crear un servicio Postgres en Dokploy **por ambiente** (Docker Service o
Compose con volumen persistente). Nunca compartir DB entre ambientes —
`cleanupTestDb()` y seed no deben correr contra prod.

## Proceso de despliegue (Dokploy)

1. Project nuevo → Application apuntando a `yigsvnsla/isc-auth-gate`
   (branch `main`), provider **Dockerfile** (ruta
   `.containers/Containerfile`, que es lo que declaran los workflows).
2. Configurar **Build Args** y **Environment** (tablas anteriores).
3. Deploy. Las migraciones las aplica solo el `entrypoint.ts` en cada arranque
   (idempotente, usa la journal de drizzle) — no hace falta correrlas a mano.
   Van en una transacción: si una falla no queda nada a medias, el contenedor
   sale con 1 y Next no arranca. Un `pg_advisory_lock` serializa réplicas: con
   varias, la primera migra y las demás esperan y no encuentran pendientes.
   Correrlas a mano sólo para un baseline:
4. Dominio en Traefik (Let's Encrypt) → container :3000.
5. Healthcheck: `GET /healthz` (rewrite de `next.config.ts` hacia
   `/api/health`) → `{"status":"ok","version":"<sha>"}`. Es la ruta que usa el `HEALTHCHECK` del
   Containerfile; en Dokploy se puede usar la misma.

## Microsoft Entra ID (por ambiente)

App registration separada:

- nombre `isc-auth-gate-dev` / `isc-auth-gate-prod`
- redirect URI: `https://<dominio-ambiente>/api/auth/callback/microsoft`
- copiar client ID y secret a las env del ambiente.

## Verificación post-deploy

1. `curl https://<dominio>/api/health` → 200.
2. Login Microsoft → callback OK, sesión persiste.
3. Dashboard admin carga usuarios / organizaciones.
4. Flujo email (verify/reset) entrega por SMTP del ambiente.

## Rollback

`deploy-prod.yaml` con `rollback_sha=<sha>` redespliega la imagen
`:prod-<sha>` ya construida. Revierte **sólo la imagen, no el schema**: la DB
queda en la última migración aplicada. Por eso las migraciones deben ser
aditivas (expand/contract: agregar columna/tabla en un release, borrar la vieja
en uno posterior), así la imagen anterior sigue funcionando con el schema nuevo.
Nunca `drizzle-kit drop` ni `push` contra prod; un schema malo se corrige con
una migración nueva hacia adelante. Activar backups programados de la DB prod
en Dokploy.
