# Auth flows

## Email / password

```
request            Server
  │                  │
  ├─ POST /api/auth/signup/email ──► create user
  │                                  └─ send verification email
  │◄── redirect to sign-in
  │
  ├─ POST /api/auth/signin/email ──► validate credentials
  │                                  └─ if !verified → error
  │◄── set session cookie
  │
  └─ GET  /api/auth/session ──────► return user + session
```

- Email verification required (`requireEmailVerification: true`)
- Verification email sent on sign-up (`sendOnSignUp: true`) and sign-in (`sendOnSignIn: true`)
- Verification link expires in 20 min (1200s)
- `autoSignIn: false` — user must verify before login
- `autoSignInAfterVerification: false` — user clicks link, then signs in manually
- Rate limit: 10 requests per 60s window

### Email templates

| Template | Trigger | Props |
|----------|---------|-------|
| `verification-email.tsx` | user.create (DB hook) | `user: { name, email }`, `url` |
| `reset-password-email.tsx` | `sendResetPassword` callback | `user: { name, email }`, `url` |
| `existing-signup-email.tsx` | `onExistingUserSignUp` callback | `user: { name, email }` |

SMTP configured in `lib/smtp.ts`. Sender: `Soporte@integritysolutions.com.ec`.
Preview emails at `bun run email:dev` (port 3001).

## Microsoft OAuth (Entra ID)

```
Browser              Server              Microsoft
  │                    │                    │
  ├─ "Sign in with Microsoft"
  ├─ GET /api/auth/signin/microsoft ──► redirect
  │◄── 302 → login.microsoftonline.com
  ├─ sign in at Microsoft ───────────────► consent
  │◄── callback with code ───────────────┘
  ├─ callback handled by Better Auth
  ├─ POST /api/auth/callback/microsoft
  │                    │
  │◄── set session cookie
```

- Configured in `env/server/schemas/microsoft.schema.ts` → validated by Zod
- Profile photo sync (configurable size: 48–648px)
- `overrideUserInfoOnSignIn: true` — updates local user data from Microsoft each login
- Tenant ID optional — `common` endpoint if omitted
- Authority defaults to `https://login.microsoftonline.com/`

## OAuth 2.1 Provider (inbound)

3rd-party apps authenticate *through* this server.

```
Client App           Server (this)       Resource Owner
  │                      │                    │
  ├─ Authorization Request ──►               │
  │                      ├── consent page ──►│
  │                      │◄── approve ───────┘
  │◄── authorization code
  ├─ Token Request ──────►                  │
  │◄── access/refresh tokens
  ├─ API call with token ──►               │
  │◄── protected resource
```

**Configuration** (`lib/auth/server/config/plugins/oauth-provider.ts`):

| Setting | Value |
|---------|-------|
| `loginPage` | `/auth/sign-in` |
| `consentPage` | `/auth/consent` |
| `allowDynamicClientRegistration` | `BETTER_AUTH_OAUTH_DYNAMIC_CLIENT_REGISTRATION` (default `false`) |
| `scopes` | `openid`, `profile`, `email`, `offline_access` + `BETTER_AUTH_OAUTH_SCOPES` |
| `cachedTrustedClients` | `BETTER_AUTH_OAUTH_TRUSTED_CLIENTS` (default `isc-gate-dashboard`) |

**Admin UI**: `/dashboard/administration/oauth` — create/delete clients, rotate secrets, manage resources and consents.

**Discovery** (under the issuer `${BETTER_AUTH_URL}/api/auth`; the root `/.well-known/openid-configuration` is 404):
- `/api/auth/.well-known/openid-configuration`
- `/.well-known/oauth-authorization-server/api/auth`

Tokens are signed with EdDSA (Ed25519). Resources (RFC 8707), custom scopes, privileges and troubleshooting: see [OAuth 2.1 / OIDC provider](./oauth-provider.md).

## Sessions

```
Client                          Server
  │                                │
  ├─ POST /api/auth/signin/email ──► set session cookie
  │◄── Set-Cookie: better-auth-session-token=...
  │◄── Set-Cookie: better-auth-session-refresh-token=...
  │
  ├─ GET  /api/auth/session ────► validate cookie
  │                                └─ refresh if expired
  │◄── { user, session }
  │
  └─ POST /api/auth/sign-out ────► clear cookies
```

- `nextCookies()` plugin handles cookie serialization for server components
- Refresh tokens slide on session check
- Cross-subdomain cookies enabled (`crossSubDomainCookies.enabled: true`)

## RBAC

```
createAccessControl(statements)
  ├── admin     → full auth + adminAc
  ├── moderator → project CRU + user:ban
  ├── user      → project:create
  └── orgSystemAdmin → org/member/invitation/team/ac + adminAc
```

**Statements** (`lib/permissions.ts`):

| Statement | Actions |
|-----------|---------|
| `auth` | create, read, update, delete, access |
| `project` | create, read, update, delete |
| `organization` | update, delete |
| `member` | create, update, delete |
| `invitation` | create, cancel |
| `team` | create, update, delete |
| `ac` | create, read, update, delete |
| `oauth` | create, read, update, delete |

Admins are users with `role: "admin"` (`adminUserIds` is empty in `lib/auth/server/config/plugins/admin.ts`). Manage them via the admin panel at `/dashboard/administration/users`.
Dynamic org roles:` isc-auth-gate/app/dashboard/administration/roles` using `dynamicAccessControl`.
