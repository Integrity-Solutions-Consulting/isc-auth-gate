import type { BetterAuthPlugin } from "better-auth";
import { oauthProvider } from "@better-auth/oauth-provider";
import { env } from "@/env/server";
import { members } from "@/database/schema";
import { organizationClaims, organizationPostLogin } from "./oauth-organization";

import { and, eq, inArray } from "drizzle-orm";
// `db` (node-postgres), no el cliente Bun SQL: `next build` evalúa esto en
// workers de Node, y aquel tiene una sola conexión (es para el entrypoint).
import { drizzlePostgreClient } from "@/database/clients/postgre";

export const BetterAuthOAuthProviderServerConfig = oauthProvider({
  loginPage: "/auth/sign-in",
  consentPage: "/auth/consent",
  allowDynamicClientRegistration:
    env.BETTER_AUTH_OAUTH_DYNAMIC_CLIENT_REGISTRATION,
  allowUnauthenticatedClientRegistration: false,
  scopes: [
    ...new Set([
      "openid",
      "profile",
      "email",
      "offline_access",
      ...env.BETTER_AUTH_OAUTH_SCOPES,
    ]),
  ],
  cachedTrustedClients: new Set(env.BETTER_AUTH_OAUTH_TRUSTED_CLIENTS),
  // Las apps verifican el access token localmente (JWKS), sin consultar al
  // gate: su duración es lo que alguien sigue dentro tras revocarle el acceso.
  // Por defecto es 1 h; al caducar, la app refresca y ahí el gate sí decide.
  accessTokenExpiresIn: 60 * 15,
  resources: env.BETTER_AUTH_OAUTH_RESOURCES,
  clientReference: async ({ session }) => {
    const activeOrg = (
      session?.session as { activeOrganizationId?: string | null }
    )?.activeOrganizationId;
    return activeOrg ?? undefined;
  },
  clientPrivileges: async ({ session, user }) => {
    if (user?.role === "admin") return true;
    const sessionRecord = session as
      { activeOrganizationId?: string | null; userId?: string } | undefined;
    const activeOrg = sessionRecord?.activeOrganizationId;
    const userId = sessionRecord?.userId;
    if (!activeOrg || !userId) return false;
    const [memberRow] = await drizzlePostgreClient
      .select({ id: members.id })
      .from(members)
      .where(
        and(
          eq(members.organizationId, activeOrg),
          eq(members.userId, userId),
          inArray(members.role, ["owner", "admin"]),
        ),
      )
      .limit(1);
    return Boolean(memberRow);
  },
  resourcePrivileges: async ({ user }) => user?.role === "admin",
  // Roles/permisos por app desde la organización elegida al iniciar sesión
  // (scope "organization"). Ver ./oauth-organization.ts.
  postLogin: organizationPostLogin,
  extensions: [organizationClaims],
  rateLimit: {
    token: { window: 60, max: 60 },
    authorize: { window: 60, max: 30 },
    introspect: { window: 60, max: 100 },
    revoke: { window: 60, max: 30 },
    register: { window: 60, max: 5 },
    userinfo: { window: 60, max: 60 },
  },
}) satisfies BetterAuthPlugin;
