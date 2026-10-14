# Database schema

20 tables managed by Better Auth + plugins. Schema auto-generated via `bun run auth:generate` from the Better Auth server config (`lib/auth/server`).

**Rules**:
- Do **not** edit `database/schema.ts` manually — regenerate with `bun run auth:generate`
- After regeneration, push with `bun run database:push` or create migrations with `bun run database:generate`

## Core auth

### users

Core user accounts.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| name | text NOT NULL | |
| email | text UNIQUE NOT NULL | |
| email_verified | boolean DEFAULT false | Verification required for login |
| image | text | Avatar URL |
| role | text | `admin`, `moderator`, `user`, or org role |
| banned | boolean DEFAULT false | |
| ban_reason | text | |
| ban_expires | timestamp | |

### sessions

Auth sessions tied to a user.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| token | text UNIQUE NOT NULL | Session token |
| expires_at | timestamp NOT NULL | |
| ip_address | text | |
| user_agent | text | |
| user_id | text FK → users.id CASCADE | |
| impersonated_by | text | Admin impersonation |
| active_organization_id | text | Current org context |

Indexed on `user_id`.

### accounts

OAuth provider accounts and password credentials.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| account_id | text NOT NULL | ID from provider |
| provider_id | text NOT NULL | `email`, `microsoft`, etc. |
| user_id | text FK → users.id CASCADE | |
| access_token | text | OAuth token |
| refresh_token | text | OAuth refresh token |
| id_token | text | OIDC ID token |
| scope | text | Granted scopes |
| password | text | Bcrypt hash (email provider) |

Indexed on `user_id`.

### verifications

Email verification codes and reset tokens.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| identifier | text NOT NULL | Email or token ID |
| value | text NOT NULL | Verification code |
| expires_at | timestamp NOT NULL | 20 min TTL |

Indexed on `identifier`.

### jwkss

JSON Web Key Sets for token signing.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| public_key | text NOT NULL | RSA public key |
| private_key | text NOT NULL | RSA private key (encrypted at rest by Better Auth) |
| expires_at | timestamp | Key rotation |

## Organizations

### organizations

Multi-tenant organization entities.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| name | text NOT NULL | |
| slug | text UNIQUE NOT NULL | URL-friendly identifier |
| logo | text | |
| metadata | text | JSON string |

Unique index on `slug`.

### organization_roles

Dynamic per-org roles created via admin UI.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| organization_id | text FK → organizations.id CASCADE | |
| role | text NOT NULL | Role name (e.g. `project-manager`) |
| permission | text NOT NULL | JSON string of allowed statements |
| created_at | timestamp NOT NULL | |
| updated_at | timestamp | |

Indexed on `organization_id` and `role`.

### members

User-organization membership.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| organization_id | text FK → organizations.id CASCADE | |
| user_id | text FK → users.id CASCADE | |
| role | text DEFAULT 'member' | Role name (static or dynamic) |

Indexed on `organization_id` and `user_id`.

### invitations

Pending org membership invitations.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| organization_id | text FK → organizations.id CASCADE | |
| email | text NOT NULL | Invitee email |
| role | text | Role to assign on accept |
| status | text DEFAULT 'pending' | `pending`, `accepted`, `rejected`, `canceled` |
| expires_at | timestamp NOT NULL | |
| inviter_id | text FK → users.id CASCADE | Who sent the invite |

Indexed on `organization_id` and `email`.

## OAuth 2.1 Provider

### oauth_clients

Registered 3rd-party OAuth client applications.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| client_id | text UNIQUE NOT NULL | Public identifier |
| client_secret | text | Confidential clients only |
| disabled | boolean DEFAULT false | |
| skip_consent | boolean | Trusted client |
| name | text | Display name |
| uri | text | Client homepage |
| icon | text | Icon URL |
| contacts | text[] | Admin contact emails |
| redirect_uris | text[] NOT NULL | Allowed callback URLs |
| grant_types | text[] | e.g. `authorization_code`, `client_credentials` |
| response_types | text[] | e.g. `code` |
| scopes | text[] | Client-requested scopes |
| require_pkce | boolean | PKCE enforcement |
| token_endpoint_auth_method | text | `none` (public), `client_secret_basic`, `client_secret_post`, `private_key_jwt` |
| post_logout_redirect_uris | text[] | Allowed `end-session` redirects |
| reference_id | text | Owning organization (active org at creation, via `clientReference`) |
| metadata | jsonb | Arbitrary metadata |
| user_id | text FK → users.id CASCADE | Owner |

Indexed on `user_id`.

### oauth_access_tokens

Issued access tokens for OAuth clients.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| token | text UNIQUE NOT NULL | Access token value |
| client_id | text FK → oauth_clients.client_id CASCADE | |
| session_id | text FK → sessions.id SET NULL | |
| user_id | text FK → users.id CASCADE | Resource owner |
| refresh_id | text FK → oauth_refresh_tokens.id CASCADE | Linked refresh token |
| scopes | text[] NOT NULL | Granted scopes |
| expires_at | timestamp NOT NULL | |

Indexed on `client_id`, `session_id`, `user_id`, `refresh_id`.

### oauth_refresh_tokens

Refresh tokens for OAuth clients (offline access).

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| token | text UNIQUE NOT NULL | Refresh token value |
| client_id | text FK → oauth_clients.client_id CASCADE | |
| session_id | text FK → sessions.id SET NULL | |
| user_id | text FK → users.id CASCADE | |
| scopes | text[] NOT NULL | |
| expires_at | timestamp NOT NULL | |
| revoked | timestamp | If set, token is revoked |

Indexed on `client_id`, `session_id`, `user_id`.

### oauth_consents

User consent records per OAuth client.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| client_id | text FK → oauth_clients.client_id CASCADE | |
| user_id | text FK → users.id CASCADE | |
| scopes | text[] NOT NULL | Approved scopes |
| created_at | timestamp NOT NULL | |
| updated_at | timestamp NOT NULL | |

Indexed on `client_id`, `user_id`.

### oauth_resources

Protected APIs (RFC 8707 resource indicators). Source of truth for resources; `BETTER_AUTH_OAUTH_RESOURCES` only seeds it (insert-only). See [oauth-provider.md](./oauth-provider.md#resources-rfc-8707).

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| identifier | text UNIQUE NOT NULL | Resource URI; becomes the token `aud` |
| name | text NOT NULL | |
| access_token_ttl / refresh_token_ttl | integer | Per-resource lifetimes (seconds) |
| signing_algorithm / signing_key_id | text | |
| allowed_scopes | text[] | Granted scopes = requested ∩ allowed (empty = no narrowing) |
| custom_claims | jsonb | Static claims added to every token |
| dpop_bound_access_tokens_required | boolean DEFAULT false | |
| disabled | boolean DEFAULT false | |
| policy_version | integer DEFAULT 1 | |
| metadata | jsonb | |

### oauth_client_resources

Client ↔ resource links, required because `enforcePerClientResources` is on (default).

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| client_id | text FK → oauth_clients.client_id CASCADE | |
| resource_id | text FK → oauth_resources.identifier CASCADE | |
| metadata | jsonb | |

Unique on (`client_id`, `resource_id`).

### oauth_client_assertions / device_codes

- `oauth_client_assertions` — used `private_key_jwt` assertion ids (`id`, `expires_at`) for replay protection.
- `device_codes` — RFC 8628 device grant state (`device_code`, `user_code`, `status`, `scope`, `resources`, `oauth_client_id`, polling fields).

## Other plugin tables

`passkeys` (passkey plugin), `two_factors` (twoFactor), `apikeys` (apiKey). See `database/schema.ts`.

## Relations diagram (logical)

```
users ──┬── sessions
         ├── accounts
         ├── members ─── organizations
         ├── invitations
         ├── oauth_clients
         ├── oauth_access_tokens ─── oauth_clients
         ├── oauth_refresh_tokens ─── oauth_clients ─── sessions
         └── oauth_consents ─── oauth_clients

oauth_clients ─── oauth_client_resources ─── oauth_resources

organizations ──┬── organization_roles
                ├── members ─── users
                └── invitations ─── users
```

## Migration workflow

```bash
# Schema changed in lib/auth/server (added/removed plugins)
bun run auth:generate    # regenerate database/schema.ts
bun run database:generate  # create migration SQL in database/migrations/
bun run database:up      # apply to database

# Quick push (no migration file, dev only)
bun run database:push
```

Migrations stored in `database/migrations/` with `meta/` snapshots and journal.
