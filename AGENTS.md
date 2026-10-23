<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.
<!-- END:nextjs-agent-rules -->

# isc-auth-gate

Next.js 16 app with Better Auth, Drizzle ORM, and shadcn/ui (base-nova preset).

## Tech Stack Facts

- **Runtime**: Bun (not Node) — uses `bun test`, `bun x`, `bun run`
- **Framework**: Next.js 16 with React 19, React Compiler enabled (`next.config.ts`)
- **Auth**: Better Auth with Microsoft OAuth, organization plugin, admin plugin, RBAC
- **Database**: PostgreSQL via Drizzle ORM, migrations in `database/migrations/`
- **Styling**: Tailwind CSS 4 with `@tailwindcss/postcss`, shadcn/ui base-nova preset
- **TypeScript**: Strict mode, `bun-types` as types, path alias `@/*` → `./*`

## Commands

```bash
bun run dev              # Next.js dev server (:3000)
bun test                 # Run all tests (bun test)
bun test --watch         # Watch mode
bun run lint             # ESLint (next/core-web-vitals + typescript config)
bun run build            # Production build

# Database
bun run database:push    # Push schema changes (no migrations) — DB desechables only
bun run database:generate  # Generate migration files
bun run database:up      # Apply pending migrations (drizzle-kit migrate)
bun run database:check   # Validate schema
bun run database:studio  # Drizzle Studio (:4001)

# Auth
bun run auth:generate   # Generate DB schema from auth config (outputs to database/schema.ts)

# Seed
bun run seed:run         # Seed test data
bun run seed:reset       # Reset seeded data

# Single test file
bun test tests/unit/auth-flow.test.ts
```

## Architecture

- `app/` — Next.js App Router (`layout.tsx`, `page.tsx`, `api/auth/[...all]/route.ts`)
- `app/dashboard/` — Protected dashboard routes with admin UI (users, organizations)
- `lib/auth.ts` — Better Auth server config (plugins: admin, organization, openAPI, nextCookies)
- `lib/auth-client.ts` — Client auth instance with admin/organization plugins
- `lib/permissions.ts` — RBAC: `admin`, `moderator`, `user` roles via `createAccessControl`
- `database/schema.ts` — Drizzle schema (users, sessions, accounts, verifications, organizations, members, invitations)
- `database/relations.ts` / `database/relations-sqlite.ts` — Relational Queries v2 (`defineRelations`), passed as `drizzle({ relations })`. Keep both in sync
- `database/index.ts` — Production DB connection (reads from `env`)
- `tests/database.ts` — Test DB connection (SQLite in-memory, `drizzle-kit/payload/sqlite` `pushSchema` del schema)
- `env/` — Zod-validated env vars: `server.schema.ts`, `database.schema.ts`, `microsoft.schema.ts` (optional), `smtp.schema.ts` (optional)
- `lib/providers.ts` — single source of truth for "is Microsoft/SMTP actually configured"; used by both the auth config and the `/setup` status panel
- `lib/setup.ts` + `app/setup/` — first-boot flow: `needsSetup()` gate, status panel and `completeSetup()` server action
- `components/ui/` — shadcn/ui components (base-nova preset, see `components.json`)

## Conventions

- GitHub Flow: everything enters `main` by squash-merged PR. Branch `<type>/<kebab-description>`, PR title in Conventional Commits; required checks `pr-title`, `branch-name`, `ci / checks`. See CONTRIBUTING.md

- **Env vars**: Validated by Zod in `env/index.ts`, not accessed directly via `process.env`
- **Auth route**: All Better Auth endpoints at `/api/auth/[...all]` via `toNextJsHandler`
- **Tests**: Use `better-auth/plugins` `testUtils` plugin, cleanup via `cleanupTestDb()`
- **Pre-commit**: Runs `bun test` (see `.husky/pre-commit`)
- **Commit messages**: Conventional commits enforced by commitlint (`@commitlint/config-conventional`)
- **Lint-staged**: Runs `prettier --write` on all staged files (see `.lintstagedrc`)
- **shadcn**: Uses `base-nova` style preset, not default. Add components with `shadcn` CLI

## Gotchas

- `database/schema.ts` is **generated** by `bun run auth:generate` — don't edit manually. With drizzle 1.x the generator also appends `export const authRelations = defineRelationsPart(...)`: drop it after regenerating, relations live in `database/relations.ts`
- drizzle-orm 1.x / Relational Queries v2: `db.query.x.findMany({ where: { id }, orderBy: { id: "asc" } })` (objects, not callbacks). The Better Auth adapter must be imported from `@better-auth/drizzle-adapter/relations-v2` **and** receive `schema` explicitly (`drizzle({ relations })` no longer exposes `db._.fullSchema` → "Schema not found")
- Tests run on **SQLite in-memory** (`tests/database.ts` + `database/schema-sqlite.ts`); never import `@/database/schema` (PostgreSQL) inside `tests/` — mixed column mappers corrupt data (`{"openid"}` instead of `["openid"]`). `tests/seed.ts` is the exception: it targets a real PG DB on purpose
- `bun run test` = `bun test --timeout=60000`. The 2 SMTP tests need `bun run email:server` running (maildev on :1025), otherwise they fail with `ECONNREFUSED`
- `database:up` runs `drizzle-kit migrate`. `drizzle-kit up` only converts the `out/` folder format (never touches the DB); it was already run for drizzle-kit 1.x: migrations are `database/migrations/<timestamp>_<name>/{migration.sql,snapshot.json}`. A `meta/_journal.json` makes the 1.x migrator throw. The first 1.x `migrate` on an existing DB upgrades `drizzle.__drizzle_migrations` in place (adds `name`/`applied_at`) without re-running migrations
- Production DBs must be migrated, never `push`ed. A DB created with `database:push` has tables but no `drizzle.__drizzle_migrations` journal, so `migrate` fails with exit 1 and no error message. Baseline it first: `bun run database:generate --custom` (empty migration) + `bun run database:up`
- `entrypoint.ts` waits for the DB with an event-driven `Bun.connect` (3s timeout per attempt, 20 attempts), takes `pg_advisory_lock` (safe with several replicas) and migrates with `drizzle-orm/bun-sql/migrator` — drizzle-kit is a devDependency and is not in the image. It exits 0 and the Containerfile does `exec bun server.js`; any non-zero exit means Next never starts. `Bun.connect` needs an explicit `socket` handler in Bun 1.4, and its promise only rejects on connection-refused — DNS failures only emit `error`, so the per-attempt `setTimeout` is what stops it hanging forever. Covered by `tests/unit/entrypoint.test.ts`
- CI validates migrations on a fresh postgres 17 with `database:up` (never `push`) and fails if `schema.ts` has changes without a generated migration
- Pages gating on `needsSetup()` need `export const dynamic = "force-dynamic"`. Otherwise Next prerenders them at build, the DB check runs against build placeholders and the redirect gets baked into static HTML (`/setup` becomes unreachable in production)
- `redirect()` cannot set the status code once the shell has flushed. Routes with a **nested** layout under `app/dashboard/` (`/dashboard/login`) answer **200 + client-side redirect** instead of 307: the body only carries `<head>`/metadata, and the router navigates after hydration. Not a bug in the gate, and moving the check to the layout does not change it — don't chase it. Single-layout routes (`/setup`, `/auth/sign-in`, `/`) do return real 307s. Verify a gate with `curl -D-`, and remember `__Secure-` cookies are dropped by curl over http: pass them with `-H "Cookie: ..."`
- Microsoft OAuth and SMTP are **optional** (`lib/providers.ts` is the single source of truth). Microsoft needs all three: `CLIENT_ID` + `CLIENT_SECRET` + a **concrete** `TENANT_ID` — `microsoftEntraId({ tenantId: "common" })` throws "requires a concrete Microsoft Entra tenant GUID" and 500s every auth page. With a partial config the plugin is simply not registered and `logProviderWarnings()` names the missing vars. SMTP needs `HOST` + `USER` + `PASS`; without it the app boots and email-dependent flows (verification, magic link, email OTP, invitations, password reset, 2FA-OTP) log `[email] SMTP no configurado` and drop the message
- `completeSetup()` (`app/setup/actions.ts`) creates the first admin inside ONE transaction plus `pg_advisory_xact_lock(1_000_001)`. Don't move the inserts back out: a mid-transaction failure (duplicate email, taken org slug) would otherwise leave a half-created admin
- `BETTER_AUTH_SERVER_TRUSTED_ORIGINS` must be a comma-separated string in `.env` (parsed to array by Zod)
- React Compiler is enabled (`reactCompiler: true` in `next.config.ts`) — be aware of rules
- `proxy.ts` (Next 16's middleware replacement) redirects `/` and `/dashboard/*` to `/dashboard/login` without a session cookie, before page code runs
- `redirect()` throws. Never call it inside a `try` whose `catch` swallows errors — that was swallowing the `/auth/sign-in` → `/dashboard` redirect for already-authenticated users
- `needsSetup()` (`lib/setup.ts`) returns `false` on a DB error on purpose (a down DB must not trap the admin on `/setup`), and now logs a warning. Silence here looks exactly like "setup already done"
- Public sign-up is **closed** (`emailAndPassword.disableSignUp: true`): nobody self-registers by email. People enter via Microsoft (`/sign-up/social` — provider-level flag, unaffected), an account the admin creates from the panel (`/admin/create-user`), the first admin from `/setup`, or an organization invitation. Email-OTP still signs in **existing** users; it just no longer auto-creates the account
- `organization/accept-invitation` needs an active session whose email matches the invitation (`ctx.context.session`, else 401). It never needed public sign-up. The invitation email is not a delivery channel for new accounts
- `BETTER_AUTH_SMTP_TRANSPORTER_SECURE` defaults to `true` = **implicit TLS**, and `.env.example` pairs it with port 587, which is the STARTTLS port: that combination fails with `SMTP expected 220 ... WRONG_VERSION_NUMBER`. Set `SECURE=false` for 587/1025 (STARTTLS/clear) and `true` only for 465. A send that fails this way is logged by the SDK but the API still answers `{"success":true}`, so "no llega el correo" means grep the logs
- Testing the auth API with curl needs `Origin: <BETTER_AUTH_URL>` on every POST (403 `MISSING_OR_NULL_ORIGIN` otherwise) and `-H "Cookie: __Secure-better-auth.session_token=..."` for authenticated calls (see the redirect note above)
