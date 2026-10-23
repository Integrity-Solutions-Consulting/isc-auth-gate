# OAuth 2.1 / OIDC provider

Operator guide for running ISC Auth Gate as an OAuth 2.1 authorization server
and OpenID Connect provider, using Better Auth `1.7.1` and
`@better-auth/oauth-provider` `1.7.1`.

- Provider config: `lib/auth/server/config/plugins/oauth-provider.ts`
- Device grant config: `lib/auth/server/config/plugins/oauth-device-authorization.ts`
- Env schema: `env/server/schemas/oauth.schema.ts` (import env from `@/env/server`)
- Token verifier inside the gate: `lib/auth/server/resource-client.ts` (`serverClient`)

Integrators (people building apps that sign in through the gate) should read
the public guide at **`/developers`** instead: quickstart, flows, scopes,
resource server, `/developers/better-auth` (Better Auth `genericOAuth`) and
`/developers/troubleshooting`.
Reference clients: [`examples/oauth-test-client`](../examples/oauth-test-client/README.md)
(Authorization Code + PKCE, plain Bun) and the external test app **isc-tmr**
(a Better Auth app using `genericOAuth`, stateless).

## Overview and URLs

The issuer is `${BETTER_AUTH_URL}/api/auth` (base path from
`BETTER_AUTH_SERVER_PATH`, default `/api/auth`). The issuer has no trailing
slash; `baseURL` strips one from `BETTER_AUTH_URL` (`.env.example` ships
`BETTER_AUTH_URL=http://localhost:3000/`, so don't build issuer strings by hand
from the raw value).

| What | URL |
|------|-----|
| Issuer | `${BETTER_AUTH_URL}/api/auth` |
| OIDC discovery | `${issuer}/.well-known/openid-configuration` |
| OAuth AS metadata (RFC 8414) | `${BETTER_AUTH_URL}/.well-known/oauth-authorization-server/api/auth` |
| JWKS | `${issuer}/jwks` |
| Authorize | `${issuer}/oauth2/authorize` |
| Token | `${issuer}/oauth2/token` |
| UserInfo | `${issuer}/oauth2/userinfo` |
| Introspection (RFC 7662) | `${issuer}/oauth2/introspect` |
| Revocation (RFC 7009) | `${issuer}/oauth2/revoke` |
| End session (RP-initiated logout) | `${issuer}/oauth2/end-session` |
| Device authorization (RFC 8628) | `${issuer}/device/code` |
| Login page | `/auth/sign-in` |
| Consent page | `/auth/consent` |
| Device verification page | `/auth/device` |

Gotchas:

- The root `/.well-known/openid-configuration` returns **404**. Discovery lives
  under the issuer.
- `/api/auth/oauth2/jwks` returns **404**. JWKS is `/api/auth/jwks` (from the
  `jwt()` plugin).
- Signing is **EdDSA (Ed25519)**: JWKS keys are `kty: "OKP"`,
  `id_token_signing_alg_values_supported: ["EdDSA"]`. Not RS256 — verifiers
  must allow `EdDSA`.
- `token_endpoint_auth_methods_supported`: `client_secret_basic`,
  `client_secret_post`, `private_key_jwt`. The dashboard form offers `none`
  (public client), `client_secret_basic` (default) and `client_secret_post`.
- Device grant: the device polls `/oauth2/token` with
  `grant_type=urn:ietf:params:oauth:grant-type:device_code`; users approve at
  `/auth/device`.

## Environment variables

Defined in `env/server/schemas/oauth.schema.ts`. Changes require a restart.

| Var | Default | Notes |
|-----|---------|-------|
| `BETTER_AUTH_OAUTH_SCOPES` | *(empty)* | Comma-separated custom scopes (e.g. `todo:read,todo:write`). Appended to the built-ins `openid`, `profile`, `email`, `offline_access` and advertised in discovery `scopes_supported`. Each must be RFC 6749 §3.3 scope syntax. |
| `BETTER_AUTH_OAUTH_RESOURCES` | `[]` | JSON array `[{ "identifier", "name"?, "allowedScopes"? }]`. **Insert-only seed** (see below). |
| `BETTER_AUTH_OAUTH_TRUSTED_CLIENTS` | `isc-gate-dashboard` | Comma-separated first-party `client_id`s (`cachedTrustedClients`); immutable via the plugin CRUD. |
| `NEXT_PUBLIC_BETTER_AUTH_OAUTH_TRUSTED_CLIENTS` | `isc-gate-dashboard` | Browser mirror of the above (`env/client`) so the UI can mark trusted clients. Keep both in sync. |
| `BETTER_AUTH_OAUTH_DYNAMIC_CLIENT_REGISTRATION` | `false` | Enables `POST /api/auth/oauth2/register` (RFC 7591). Unauthenticated registration is always off (`allowUnauthenticatedClientRegistration: false`). |

```bash
# .env
BETTER_AUTH_OAUTH_SCOPES=todo:read,todo:write
BETTER_AUTH_OAUTH_RESOURCES='[{"identifier":"http://localhost:4200/api","name":"TMR API","allowedScopes":["openid","profile","email","offline_access","todo:read","todo:write"]}]'
```

### Resource seed semantics

`BETTER_AUTH_OAUTH_RESOURCES` is passed as the plugin's `resources` with the
default `resourceSeedMode: "insertOnly"`: on startup, listed resources that
don't exist yet are inserted; existing rows are **never** updated. Editing the
env later does not change an existing resource, and a restart never overwrites
dashboard edits. The `oauth_resources` table is the source of truth — manage
resources in the dashboard and leave the env `[]` unless you need bootstrap
data.

## Privileges

From `oauth-provider.ts`:

| Hook | Who passes |
|------|-----------|
| `clientPrivileges` (create/update/delete/list clients) | Global `admin` (`users.role`), **or** `owner`/`admin` member of the session's **active organization** |
| `clientReference` | Returns the active organization id; stored as the client's `reference_id`, so org admins only see their org's clients |
| `resourcePrivileges` (resources CRUD, client linking) | Global `admin` only |

Org owners/admins manage their apps at
`/dashboard/administration/organizations/[id]/apps`.

## Registering a client (dashboard)

`/dashboard/administration/oauth` → **OAuth Apps** (tabs: clients, resources,
consents, …) → create client. The form has 4 steps:

1. **Metadata** — name, URIs (homepage, logo, …).
2. **Redirects** — redirect URIs and post-logout redirect URIs.
3. **OAuth config** — scopes, `token_endpoint_auth_method`, grant types,
   **Resources** (links the client to resources), require PKCE, skip consent, …
4. **Summary**.

Known limitation — **`client_credentials` (M2M)**: the client needs
`client_credentials_scopes` (column on `oauth_clients`), and
`openid`/`profile`/`email`/`offline_access` are rejected for M2M. Those scopes
can only be set through the `SERVER_ONLY` admin endpoints
(`auth.api.adminCreateOAuthClient` / `auth.api.adminUpdateOAuthClient`); the
dashboard form cannot set them yet.

The `client_secret` is shown **once** after creation; copy it then (it can be
rotated later). Scopes are validated client-side per RFC 6749 §3.3
(`todo:read` is fine) and server-side against the configured scope list.

## Resources (RFC 8707)

A resource is an API identified by a URI string (`identifier`), e.g.
`http://localhost:4200/api`. It is only an identifier — it need not be
reachable — but it must be exactly what the client sends as `resource` and
what the API checks as `audience`.

### Tables

- `oauth_resources` — `identifier`, `name`, `access_token_ttl`,
  `refresh_token_ttl`, `signing_algorithm`, `allowed_scopes`, `custom_claims`
  (static: same value in every token), `dpop_bound_access_tokens_required`,
  `disabled`, `metadata`.
- `oauth_client_resources` — client ↔ resource links.

### Per-client linking

`enforcePerClientResources` is left at its default **`true`**: a client must be
linked to every resource it requests, otherwise `/oauth2/authorize` and
`/oauth2/token` fail with **`invalid_target`** (same error for unknown or
disabled resources).

Link a client:

- at creation, step 3 "Resources"; or
- on the client detail page (`/dashboard/administration/oauth/[clientId]`),
  card **"Resources (RFC 8707)"** — one switch per resource.

### What the token looks like

With `resource`, the access token is a JWT (EdDSA) with
`aud = [<resource identifier>, <issuer>/oauth2/userinfo]`, `iss`, `sub`,
`azp` (= `client_id`), `scope` and `exp` (3600 s unless the resource sets
`accessTokenTtl`). Without `resource`, the access token is opaque and must be
verified via introspection. Clients should send the same `resource` on refresh
to keep the audience.

APIs verify with `audience` = the resource identifier (not the gate URL).
Inside the gate, use `serverClient.verifyAccessTokenRequest(request, opts)`
(Bearer + DPoP, recommended) or
`serverClient.verifyBearerToken(token, { verifyOptions: { issuer, audience }, requiredScopes })`.
The option is **`requiredScopes`** — a `scopes` key is silently ignored and no
scope is enforced. A token missing a required scope is rejected with
`403 insufficient_scope`.
Any stack: `jose` `createRemoteJWKSet(new URL(`${issuer}/jwks`))` +
`jwtVerify(token, jwks, { issuer, audience, algorithms: ["EdDSA"] })`, then
check the space-separated `scope` claim. The integrator guide
(`/developers` → resource server) has full examples.

### Endpoints

The plugin's resource admin endpoints (`adminCreateOAuthResource`,
`adminListOAuthResources`, `adminUpdateOAuthResource`,
`adminDeleteOAuthResource`, `adminLinkClientResource`,
`adminUnlinkClientResource`) are `SERVER_ONLY`: **404 over HTTP**, callable
only as `auth.api.*`. `authClient.oauth2.*` has no resource methods. The
dashboard therefore goes through these Next.js routes, all admin-only
(no session → `401`, non-admin → `403`):

| Method | Route | Backed by |
|--------|-------|-----------|
| GET | `/api/admin/resources` | `adminListOAuthResources` |
| POST | `/api/admin/resources` | `adminCreateOAuthResource` |
| PATCH | `/api/admin/resources/:identifier` | `adminUpdateOAuthResource` |
| DELETE | `/api/admin/resources/:identifier` | `adminDeleteOAuthResource` |
| POST | `/api/admin/resources/:identifier/clients/:clientId` | `adminLinkClientResource` (idempotent) |
| DELETE | `/api/admin/resources/:identifier/clients/:clientId` | `adminUnlinkClientResource` (idempotent) |
| GET | `/api/admin/clients/:clientId/resources` | Reads `oauth_client_resources` directly (the plugin has no "list a client's resources" endpoint); returns identifiers |

Shared helpers in `app/api/admin/resources/helpers.ts`:

- `requireAdmin()` — returns the `401`/`403` response, or `null` for admins.
- `errorResponse(error, fallback)` — forwards only plugin `APIError`s (with
  their `error_description`); anything else (e.g. DB errors carrying SQL) is
  logged and answered with a generic `500`. SQL never leaks to the client.
- `isUniqueViolation(error)` — detects Postgres `23505` through drizzle's
  wrapped `cause` chain (used to make link idempotent).

Tests: `tests/unit/resources-flow.test.ts`.

### The `allowedScopes` intersection trap

When the client sends `resource`, the granted scopes are
**requested ∩ resource `allowedScopes`** (an empty `allowedScopes` means no
narrowing). OIDC scopes are **not** exempt. If a resource's `allowedScopes`
lacks `openid`:

- no `id_token` is issued;
- `/oauth2/userinfo` returns `400 invalid_scope: Missing required scope`;
- a Better Auth client (`genericOAuth`) ends at `?error=unable_to_get_user_info`.

Fix: include `openid profile email offline_access` in the resource's
`allowedScopes` next to the API scopes. The resource create/edit dialogs show a
**"Falta el scope openid"** warning with a one-click button that adds them.

If the intersection is empty, authorize fails with `invalid_scope` "none of the
requested scopes are allowed for resource X".

## Custom scopes workflow

A custom scope (e.g. `todo:read`) must be allowed at three levels:

1. **Provider** — add it to `BETTER_AUTH_OAUTH_SCOPES` and restart. Otherwise
   create-client fails with "cannot request scope todo:read".
2. **Client** — include it in the client's scopes (step 3). Otherwise
   authorize fails with `invalid_scope`.
3. **Resource** — include it in the resource's `allowedScopes` (together with
   the OIDC scopes, see the trap above), or leave `allowedScopes` empty.

Then the client requests it (`scope=openid profile email offline_access todo:read`
plus `resource=<identifier>`) and the API checks it in the `scope` claim.

## Rate limits

Per-endpoint limits on `/oauth2/*` (60 s window):

| Endpoint | Max |
|----------|-----|
| token | 60 |
| authorize | 30 |
| introspect | 100 |
| revoke | 30 |
| register | 5 |
| userinfo | 60 |

Global rate limiting is described in [rate-limiting.md](./rate-limiting.md).

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Client app ends at `?error=unable_to_get_user_info` | Resource `allowedScopes` lacks `openid`, so userinfo returns `invalid_scope` | Add `openid profile email offline_access` to the resource (dashboard warning button) |
| `invalid_target` at authorize/token | Resource not configured, disabled, or client not linked | Create/enable the resource; link it in the client's "Resources (RFC 8707)" card |
| `invalid_scope` at authorize | Scope not in the client's scopes (or empty intersection with resource `allowedScopes`) | Edit client scopes / resource `allowedScopes` |
| "cannot request scope X" creating a client | Scope not in `BETTER_AUTH_OAUTH_SCOPES` | Add it to the env and restart |
| `invalid_client` at token | Auth method mismatch (`client_secret_basic` vs `client_secret_post`) or wrong secret. Better Auth `genericOAuth` defaults to post; set `authentication: "basic"` for basic clients | Align the client's method and the app config; rotate the secret if lost |
| API accepts tokens without the expected scope | Verifier passed `scopes` instead of `requiredScopes` (ignored) | Use `requiredScopes`; missing scope then yields `403 insufficient_scope` |
| Discovery/JWKS 404 | Using root `/.well-known/openid-configuration` or `/api/auth/oauth2/jwks` | Use `${issuer}/.well-known/openid-configuration` and `${issuer}/jwks` |
| Token verification fails on algorithm | Verifier only allows RS256 | Allow `EdDSA` |
| Login on the gate loops back to the login page on localhost | `BETTER_AUTH_SERVER_DOMAIN` set to a foreign domain (cross-subdomain cookies) | Leave it empty locally |
| Server-side fetch TLS errors (self-signed dev certs) | Node doesn't trust the dev CA | Start **both** the gate and the client with `NODE_EXTRA_CA_CERTS=<rootCA.pem>` |
| Client app and gate overwrite each other's cookies on the same host | Cookies are not port-isolated | Give the client app a distinct `advanced.cookiePrefix` |

## Roles and permissions in tokens: not yet implemented

The gate models global roles (`admin` / `moderator` / `user`, `users.role`,
`lib/permissions.ts`) and organization roles (`owner` / `admin` / `member` /
`systemAdmin` plus dynamic roles in `organization_roles`). **None of this is
emitted in tokens today** (no custom access-token claims are configured). It is
being designed; until then, resource servers must not expect role or
permission claims.
