# Contribuir a isc-auth-gate

Usamos **GitHub Flow**: `main` siempre está desplegable y todo cambio entra por
Pull Request. `main` está protegida — no se puede hacer push directo.

```
rama tipo/descripcion ──► PR a main ──► checks + 1 aprobación ──► squash merge
                                                                      │
          deploy DEV automático ◄─────────────────────────────────────┘
          deploy PROD manual (Actions → Deploy Prod) ──► aprobación del owner
```

## 1. Rama

Sal siempre de `main` actualizada:

```bash
git switch main && git pull
git switch -c feat/login-passkey
```

Formato: **`<tipo>/<descripcion-en-kebab-case>`** (minúsculas, números, `.`, `_`, `-`).

| Tipo | Para |
|---|---|
| `feat` | funcionalidad nueva |
| `fix` | corrección de bug |
| `hotfix` | corrección urgente para prod |
| `refactor` | cambio interno sin cambiar comportamiento |
| `perf` | rendimiento |
| `test` | sólo tests |
| `docs` | sólo documentación |
| `ci` / `build` | workflows, Containerfile, dependencias de build |
| `chore` | mantenimiento (deps, config) |

El check `branch-name` del PR rechaza otro formato. Una rama mal nombrada no se
renombra en el PR: crea una nueva y abre otro PR.

## 2. Commits

[Conventional Commits](https://www.conventionalcommits.org/), validado por el
hook `commit-msg` (commitlint) al hacer `git commit`:

```
feat: agregar login con passkey
fix(auth): no perder la sesión al rotar el secret
chore(deps): actualizar better-auth a 1.7.2
```

Dentro de la rama puedes hacer los commits que quieras: al mergear se aplastan
en uno solo (squash).

## 3. Pull Request

- **El título del PR es el commit que queda en `main`**, así que también debe
  seguir Conventional Commits. Lo valida el check `pr-title` (se re-evalúa al
  editar el título).
- Completa la plantilla: qué cambia, cómo se probó y los checklists de base de
  datos y variables de entorno.
- Abre el PR como *Draft* si aún no está listo para revisión.

### Checks obligatorios

| Check | Qué valida |
|---|---|
| `pr-title` | título en Conventional Commits |
| `branch-name` | nombre de rama `tipo/descripcion` |
| `ci / checks` | lint → historial de migraciones → schema sin migración pendiente → migraciones sobre PostgreSQL 17 limpio → `SELECT 1` → tests → `next build` |

Además: **1 aprobación**, conversaciones resueltas, rama al día con `main`
(botón *Update branch*), y revisión del owner (CODEOWNERS) si tocas
`.github/`, `.containers/`, `entrypoint.ts`, migraciones, `database/schema.ts`,
`env/`, `lib/auth/server/`, `next.config.ts` o dependencias. Un push nuevo
descarta las aprobaciones anteriores.

Corre lo mismo en local antes de abrir el PR:

```bash
bun run lint && bun run test && bun run build
```

`bun run test` necesita `bun run email:server` (maildev en :1025) para los
tests de SMTP.

## 4. Base de datos

- Cambia `database/schema.ts` y genera la migración: `bun run database:generate`.
  CI falla si el schema tiene cambios sin migración.
- **Migraciones aditivas** (expand/contract): agrega columnas/tablas en un PR y
  borra las viejas en uno posterior. Un rollback revierte la imagen, **no** el
  schema; la imagen anterior tiene que seguir funcionando con el schema nuevo.
- Nunca `bun run database:push` contra dev o prod. Las migraciones las aplica el
  contenedor al arrancar (`entrypoint.ts`).

## 5. Variables de entorno

- Servidor: un preset por área en `env/server/schemas/` (t3-env).
  Cliente (`NEXT_PUBLIC_*`): `env/client/index.ts`.
- Si agregas una obligatoria, agrégala también a `.env.example` y al env del job
  de `.github/workflows/ci.yaml`, y avisa en el PR para crearla en Dokploy
  (dev y prod) **antes** de desplegar: el contenedor no arranca si falta.

## 6. Merge y deploy

- Sólo **squash merge**. La rama se borra sola al mergear.
- Merge a `main` → workflow **CI + Deploy Dev**: CI, imagen
  `ghcr.io/yigsvnsla/isc-auth-gate:<sha>`, deploy en Dokploy y health check que
  exige que responda ese SHA.
- **Prod** es manual: *Actions → Deploy Prod → Run workflow* desde `main`. El
  job de deploy espera la aprobación del owner (environment `production`).
- **Rollback de prod**: *Deploy Prod* con `rollback_sha` = SHA completo de un
  deploy anterior. Redespliega esa imagen sin reconstruir; no revierte
  migraciones.

## 7. Secretos

Nunca en el repo ni en el PR. Los de deploy viven en los environments
`development` / `production` de GitHub, sólo accesibles desde `main`; los de
runtime, en el env de cada app de Dokploy. Copia `.env.example` a `.env` para
desarrollo local.
