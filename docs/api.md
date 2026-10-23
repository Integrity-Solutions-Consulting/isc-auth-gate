# API endpoints

All auth endpoints served by a single catch-all route:

```ts
// app/api/auth/[...all]/route.ts
export const { GET, POST } = toNextJsHandler(auth);
```

Swagger UI at `/api/auth/reference` (dev only).

## Core auth

| Method | Path | Plugin | Purpose |
|--------|------|--------|---------|
| POST | `/api/auth/signin/email` | email-password | Login with email + password |
| POST | `/api/auth/signup/email` | email-password | Register new user |
| POST | `/api/auth/forget-password` | email-password | Send password reset email |
| POST | `/api/auth/reset-password` | email-password | Reset password with token |
| GET | `/api/auth/signin/microsoft` | social-providers | Microsoft OAuth redirect |
| POST | `/api/auth/callback/microsoft` | social-providers | Microsoft OAuth callback |
| GET | `/api/auth/session` | core | Get current session |
| POST | `/api/auth/sign-out` | core | Sign out (clear session) |
| POST | `/api/auth/verify-email` | email-verification | Verify email with token |
| POST | `/api/auth/send-verification-email` | email-verification | Resend verification email |

## Admin API

Requires `admin` role. Full reference: Better Auth [Admin API docs](https://www.better-auth.com/docs/admin).

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/admin/create-user` | Create user |
| POST | `/api/auth/admin/update-user` | Update user |
| POST | `/api/auth/admin/ban-user` | Ban user |
| POST | `/api/auth/admin/unban-user` | Unban user |
| POST | `/api/auth/admin/remove-user` | Delete user |
| POST | `/api/auth/admin/set-role` | Set user role |
| GET | `/api/auth/admin/list-users` | List users (paginated, filterable) |
| GET | `/api/auth/admin/get-user` | Get user by ID |

Consumed client-side via SWR hooks in `hooks/use-admin-list-users.ts`, `hooks/use-admin-ban-user.ts`, etc.

## Organization API

Requires organization membership. Full reference: Better Auth [Organization docs](https://www.better-auth.com/docs/organization).

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/organization/create` | Create org |
| POST | `/api/auth/organization/update` | Update org |
| POST | `/api/auth/organization/delete` | Delete org |
| GET | `/api/auth/organization/list` | List user's orgs |
| GET | `/api/auth/organization/get-full-organization` | Get org with members |
| POST | `/api/auth/organization/invite-member` | Invite member |
| POST | `/api/auth/organization/cancel-invitation` | Cancel invitation |
| POST | `/api/auth/organization/accept-invitation` | Accept invitation |
| POST | `/api/auth/organization/reject-invitation` | Reject invitation |
| POST | `/api/auth/organization/remove-member` | Remove member |
| POST | `/api/auth/organization/update-member-role` | Update member role |
| POST | `/api/auth/organization/change-role` | Change active org role |
| POST | `/api/auth/organization/set-active-organization` | Set active org |

### Dynamic roles (custom server actions)

Defined in `lib/actions/admin-roles.ts`:

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/organization/list-organizations` | List all orgs (admin) |
| POST | `/api/auth/organization/list-org-roles` | List roles for org |
| POST | `/api/auth/organization/create-org-role` | Create dynamic role |
| POST | `/api/auth/organization/update-org-role` | Update role permissions |
| POST | `/api/auth/organization/delete-org-role` | Delete role |

Helper `withOrgAdminAccess()` in `lib/admin-org-access.ts` ensures caller is org member before CRUD.

## OAuth 2.1 Provider (inbound)

Better Auth OAuth Provider plugin endpoints (`lib/auth/server/config/plugins/oauth-provider.ts`). Issuer: `${BETTER_AUTH_URL}/api/auth`. Tokens signed with EdDSA (Ed25519). Operator guide: [OAuth 2.1 / OIDC provider](./oauth-provider.md). Upstream reference: [OAuth Provider docs](https://www.better-auth.com/docs/plugins/oauth-provider).

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/auth/.well-known/openid-configuration` | OIDC discovery (root `/.well-known/openid-configuration` is 404) |
| GET | `/.well-known/oauth-authorization-server/api/auth` | OAuth AS metadata (RFC 8414) |
| GET | `/api/auth/jwks` | JWKS (`/api/auth/oauth2/jwks` is 404) |
| GET | `/api/auth/oauth2/authorize` | Authorization endpoint |
| POST | `/api/auth/oauth2/token` | Token endpoint (also device-code grant) |
| GET | `/api/auth/oauth2/userinfo` | Userinfo endpoint |
| POST | `/api/auth/oauth2/introspect` | Token introspection (RFC 7662) |
| POST | `/api/auth/oauth2/revoke` | Token revocation (RFC 7009) |
| GET | `/api/auth/oauth2/end-session` | RP-initiated logout |
| POST | `/api/auth/oauth2/register` | Dynamic client registration (only if `BETTER_AUTH_OAUTH_DYNAMIC_CLIENT_REGISTRATION=true`) |
| POST | `/api/auth/device/code` | Device authorization request (RFC 8628); users approve at `/auth/device` |
| POST | `/api/auth/oauth2/consent` | Submit consent decision (consent page) |
| GET | `/api/auth/oauth2/get-consent` | Get one consent |
| GET | `/api/auth/oauth2/get-consents` | List user's consents |
| POST | `/api/auth/oauth2/update-consent` | Update consent scopes |
| POST | `/api/auth/oauth2/delete-consent` | Revoke consent |

### OAuth client management

Via `authClient.oauth2.*` (client-side, no server actions). Allowed for global admins and owners/admins of the active organization (`clientPrivileges`):

| Method | Client call | Path | Purpose |
|--------|-------------|------|---------|
| GET | `authClient.oauth2.getClients()` | `/oauth2/get-clients` | List clients |
| GET | `authClient.oauth2.getClient()` | `/oauth2/get-client` | Get one client |
| GET | `authClient.oauth2.publicClient()` | `/oauth2/public-client` | Public client info (consent page) |
| POST | `authClient.oauth2.createClient()` | `/oauth2/create-client` | Register new client |
| POST | `authClient.oauth2.updateClient()` | `/oauth2/update-client` | Update client metadata |
| POST | `authClient.oauth2.deleteClient()` | `/oauth2/delete-client` | Delete client |
| POST | `authClient.oauth2.client.rotateSecret()` | `/oauth2/client/rotate-secret` | Rotate client secret |
| GET | `authClient.oauth2.getConsents()` | `/oauth2/get-consents` | List user consents |
| POST | `authClient.oauth2.deleteConsent()` | `/oauth2/delete-consent` | Revoke consent |

Admin UI at `/dashboard/administration/oauth`.

### Admin route handlers (`app/api/admin/**`)

The plugin's resource admin endpoints are `SERVER_ONLY` (404 over HTTP; only `auth.api.*`), so the dashboard uses these Next.js routes. All require an `admin` session.

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/admin/resources` | List resources (`adminListOAuthResources`) |
| POST | `/api/admin/resources` | Create resource (`adminCreateOAuthResource`) |
| PATCH | `/api/admin/resources/:identifier` | Update resource (`adminUpdateOAuthResource`) |
| DELETE | `/api/admin/resources/:identifier` | Delete resource (`adminDeleteOAuthResource`) |
| POST | `/api/admin/resources/:identifier/clients/:clientId` | Link client ↔ resource (`adminLinkClientResource`, idempotent) |
| DELETE | `/api/admin/resources/:identifier/clients/:clientId` | Unlink (`adminUnlinkClientResource`, idempotent) |
| GET | `/api/admin/clients/:clientId/resources` | Identifiers linked to a client (reads `oauth_client_resources`) |
| PATCH | `/api/admin/clients/:clientId` | Enable/disable a client (`{ disabled: boolean }`; not exposed by `update-client`) |
| GET | `/api/admin/oauth-clients` | `{ clients: [{ clientId, name }] }` for KPI filters |
| GET, POST | `/api/admin/users/:userId/consents` | List / create a user's consents |
| GET, PATCH, DELETE | `/api/admin/users/:userId/consents/:consentId` | Read / update scopes / delete a consent |

Resource routes return `401` without a session and `403` for non-admins; errors go through `app/api/admin/resources/helpers.ts` (`errorResponse` never leaks SQL). Seeding, linking, the `allowedScopes` intersection rule and troubleshooting: [OAuth 2.1 / OIDC provider](./oauth-provider.md).

## Two-Factor Authentication (RFC 6238 / OTP / backup)

Enabled natively via the `twoFactor` plugin in `lib/auth/server/config/plugins/two-factor.ts`. It applies
**only to email/password accounts** — Microsoft OAuth users are not
subject to 2FA (Better Auth limitation). All flows are framework-native;
no custom 2FA logic was written.

Configuration highlights (`lib/auth/server/config/plugins/two-factor.ts`):

- `issuer`: `BETTER_AUTH_SERVER_NAME`
- `totpOptions`: TOTP authenticator apps
- `otpOptions.sendOTP`: reuses the existing `email.send` hook to deliver
  email OTP codes (no custom transport)
- `backupCodeOptions`: 10 codes, length 10, encrypted at rest
- `trustDeviceMaxAge`: 30 days

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/two-factor/enable` | Enable 2FA (returns TOTP URI + backup codes) |
| POST | `/api/auth/two-factor/disable` | Disable 2FA (password required) |
| POST | `/api/auth/two-factor/get-totp-uri` | Get TOTP provisioning URI |
| POST | `/api/auth/two-factor/send-otp` | Send email OTP |
| POST | `/api/auth/two-factor/verify-totp` | Verify a TOTP code |
| POST | `/api/auth/two-factor/verify-otp` | Verify an email OTP |
| POST | `/api/auth/two-factor/generate-backup-codes` | (Re)generate backup codes |
| POST | `/api/auth/two-factor/verify-backup-code` | Verify a backup code |

`/two-factor/enable`, `/disable` and `/get-totp-uri` use
`sensitiveSessionMiddleware` and require password re-verification
(`shouldRequirePassword`). When 2FA is enabled and verified,
`/two-factor/verify-totp` rotates the session cookie (the old session is
deleted), so clients must persist the new session.

When the sign-in response has `twoFactorRedirect: true`, the sign-in form
(`app/auth/sign-in/sign-in-form.tsx`) sends the browser to `/auth/2fa`.

### UI

- `/auth/2fa` — second-factor challenge (TOTP / email OTP / backup code), with
  "trust this device" option.
- `/dashboard/settings/security` — self-service: enable / disable / regenerate
  backup codes. Shows the TOTP secret as a QR (`react-qr-code`) and the raw
  backup codes on enable.

### Tests

`tests/unit/two-factor-flow.test.ts` covers enable → verify TOTP → disable,
backup-code verification, and wrong-code rejection.

## Rate limiting

Habilitado en todos los entornos (`enabled: true`). Por defecto usa storage en
memoria (por instancia de app). Límites por-endpoint:

- `/sign-in/*`: 10 req/min
- `/sign-up/*`: 5 req/min
- `/two-factor/verify-*`: 10 req/min
- `/forget-password`, `/reset-password`: 5 req/min

Better Auth NO genera la tabla `rateLimit`, así que el storage en DB no está
disponible sin migración manual. Para un límite **compartido entre
instancias** (multi-nodo), configurar Redis mediante el feature flag:

```bash
BETTER_AUTH_RATE_LIMIT_STORAGE=redis
REDIS_URL=redis://host:6379
```

Con el flag `redis`, el rate-limit se respalda en Redis vía un `customStorage`
atómico (script Lua: count + lastRequest por clave, con `EXPIRE` para purga).
Si Redis cae, el límite falla abierto (permite la petición) para no romper el
auth. Sin el flag, se usa memoria. Ver
[`docs/rate-limiting.md`](./rate-limiting.md) para detalles.

## Error responses

Standard Better Auth error format:

```json
{
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid email or password",
  "status": 401
}
```

Common error codes:
- `INVALID_CREDENTIALS` — wrong email/password
- `EMAIL_NOT_VERIFIED` — email verification pending
- `USER_NOT_FOUND` — account not found
- `RATE_LIMIT_EXCEEDED` — too many requests (10/60s)
- `UNAUTHORIZED` — insufficient role/permissions
- `INVALID_TOKEN` — expired or forged token
