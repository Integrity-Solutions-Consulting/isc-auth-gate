# Development guide

## Setup

```bash
git clone <repo>
cd isc-auth-gate
bun install
cp .env.example .env
```

Fill `.env` with your values (see `.env.example` for all vars).

### Microsoft Entra ID app registration

1. Go to [Entra ID > App registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps)
2. New registration → name `isc-auth-gate-dev`
3. Redirect URI: `http://localhost:3000/api/auth/callback/microsoft`
4. Certificates & secrets → new client secret
5. Copy client ID + secret to `.env`
6. Optional: tenant ID for single-tenant; skip for `common` endpoint

### SMTP

Any SMTP server works. Office365 example:

```env
BETTER_AUTH_SMTP_TRANSPORTER_HOST=smtp.office365.com
BETTER_AUTH_SMTP_TRANSPORTER_PORT=587
BETTER_AUTH_SMTP_TRANSPORTER_SECURE=true
BETTER_AUTH_SMTP_TRANSPORTER_USER=Soporte@integritysolutions.com.ec
BETTER_AUTH_SMTP_TRANSPORTER_PASS=your-password-or-app-password
```

For dev, use [Ethereal Email](https://ethereal.email) (fake SMTP, messages visible in web UI).

### Database

```bash
bun run database:push    # create tables
bun run seed:run         # insert test data
```

PostgreSQL must be running. Connection configured via env vars.

## Dev server

```bash
bun run dev              # http://localhost:3000
bun run email:dev        # email preview at http://localhost:3001 (separate terminal)
```

Hot reload enabled via Next.js Turbo.

## Production build

```bash
bun run build            # type-check + compile
bun start                # serve on :3000
```

Build fails on type errors. Passes through Next.js build pipeline.

## Tests

```bash
bun test                 # all test files
bun test --watch         # re-run on changes
bun test tests/unit/auth-flow.test.ts  # single file
```

Tests connect to the same database as dev (`tests/database.ts`). No isolated test DB — `cleanupTestDb()` truncates tables between runs.

**Important**: `cleanupTestDb()` truncates: sessions, accounts, verifications, members, invitations, organizations, users, organization_roles. OAuth tables not truncated yet — add to `TRUNCATE` list if tests touch OAuth.

### Test files

| File | Coverage |
|------|----------|
| `tests/unit/auth-flow.test.ts` | Session CRUD: create user with password, persist, delete |
| `tests/unit/users.test.ts` | User CRUD: required fields, unique IDs, defaults, custom fields |
| `tests/unit/users-advanced.test.ts` | Auth headers, cookie/session token, login, session cleanup |
| `tests/unit/organizations.test.ts` | Org CRUD: create, save, add member, delete org (cascade), delete user (cascade) |
| `tests/unit/roles-dac.test.ts` | Dynamic access control: create org role, persist, non-member rejection, delete role |

## Dependency management

**Runtime**: Bun (not npm/pnpm). Install with `bun add <package>`.

### Known version constraints

| Package | Version | Reason |
|---------|---------|--------|
| `better-auth` | `1.7.1` | Pinned exactly; must match the oauth-provider version |
| `@better-auth/oauth-provider` | `1.7.1` | Pinned exactly to the same version as `better-auth` |
| `@react-email/ui` | `6.6.4` | Pre-installed with bun to bypass npm peer-dep conflict |
| `next` | `16.2.4` | Next.js 16 with React 19 |

## Pre-commit hooks

Enforced by Husky:

1. **`bun test`** — all tests must pass before commit
2. **Conventional commits** — enforced by commitlint:
   ```
   feat: add OAuth client management
   fix: resolve email verification timeout
   docs: add auth-flow documentation
   chore: update dependencies
   ```
3. **Prettier** — runs on all staged files via lint-staged

## React Compiler

Enabled in `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  reactCompiler: true,
};
```

This means React Compiler auto-memoizes components. Rules:
- Don't use `useMemo`/`useCallback`/`React.memo` unless the compiler can't optimize
- If React Compiler complains, restructure, don't suppress
- Keep hooks pure — no conditional hook calls

See [React Compiler rules](https://react.dev/learn/react-compiler#rules).

## Schema generation

`database/schema.ts` is generated, not hand-written:

```bash
bun run auth:generate
```

This should read the Better Auth server config (`lib/auth/server`), detect all plugins (core, admin, organization, oauthProvider), and output Drizzle schema + relations. Note: the `auth:generate` script in `package.json` still points to `./lib/auth.ts`, which no longer exists — fix the `--config` path before running it. **Do not edit `database/schema.ts` manually** — any custom fields must be added via Better Auth plugin config or handled in a separate file.

After regeneration, push to DB:

```bash
bun run database:push     # fast, no migration file
bun run database:generate # create migration file
bun run database:up       # apply migration
```

## Env vars

All env vars validated by Zod (t3-env) in `env/`:

| File | Scope |
|------|-------|
| `env/server/schemas/server.schema.ts` | Server config (URL, base path, name, host, port, secret, domain, trusted origins, rate-limit storage) |
| `env/server/schemas/database.schema.ts` | PostgreSQL connection |
| `env/server/schemas/microsoft.schema.ts` | Microsoft Entra ID OAuth |
| `env/server/schemas/smtp.schema.ts` | SMTP transport |
| `env/server/schemas/captcha.schema.ts` | Captcha provider |
| `env/server/schemas/oauth.schema.ts` | OAuth provider: scopes, resources seed, trusted clients, dynamic client registration ([oauth-provider.md](./oauth-provider.md)) |
| `env/client/index.ts` | Browser `NEXT_PUBLIC_*` vars |

Server schemas are merged in `env/server/index.ts`. Access via `import { env } from "@/env/server"` (or `"@/env/client"` in the browser) — never `process.env`.

## Project conventions

- **Code**: semantic, concise, no comments unless non-obvious logic
- **Ponytail markers**: `// ponytail:` comments mark intentional shortcuts with documented upgrade path
- **shadcn/ui**: base-nova preset, not default. Add components: `bun x shadcn add button`
- **No barrel exports**: import directly from file path
- **Path alias**: `@/*` maps to project root, e.g. `import { db } from "@/database"`
- **TypeScript**: strict mode, `bun-types` for Bun APIs, bundler module resolution
