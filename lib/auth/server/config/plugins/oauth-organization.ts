import {
  getOAuthProviderState,
  type OAuthProviderExtension,
} from "@better-auth/oauth-provider";
import { APIError } from "better-auth/api";
import {
  ORGANIZATION_SCOPE,
  resolveOrganizationAccess,
} from "@/lib/oauth-organizations";

// Roles y permisos por app desde la organización (ver lib/oauth-organizations).
//
//   authorize(scope incluye "organization")
//     → shouldRedirect: ¿la org activa de la sesión está vinculada a la app y
//       el usuario es miembro? si no → /auth/select-organization
//     → la página hace organization.setActive + POST /oauth2/continue
//     → consentReferenceId = org activa (queda en consentimiento y tokens)
//     → claims.accessToken: org_id, org_role, permissions

// Los tipos del plugin acotan scopes a los internos; "organization" es propio.
type PostLoginContext = {
  user: { id: string };
  session: Record<string, unknown>; // activeOrganizationId (plugin organization)
  scopes: readonly string[];
};

const wantsOrganization = (scopes: readonly string[]) =>
  scopes.includes(ORGANIZATION_SCOPE);

/** client_id del authorize en curso (el plugin guarda la query antes de postLogin). */
async function currentClientId(): Promise<string | undefined> {
  const state = await getOAuthProviderState();
  return state?.query
    ? (new URLSearchParams(state.query).get("client_id") ?? undefined)
    : undefined;
}

async function activeOrganizationFor(
  userId: string,
  session: Record<string, unknown>,
): Promise<string | null> {
  const clientId = await currentClientId();
  const organizationId =
    typeof session.activeOrganizationId === "string"
      ? session.activeOrganizationId
      : null;
  if (!clientId || !organizationId) return null;
  const access = await resolveOrganizationAccess(userId, clientId, organizationId);
  return access ? organizationId : null;
}

export const organizationPostLogin = {
  page: "/auth/select-organization",
  shouldRedirect: async ({ user, session, scopes }: PostLoginContext) => {
    if (!wantsOrganization(scopes)) return false;
    return !(await activeOrganizationFor(user.id, session));
  },
  consentReferenceId: async ({ user, session, scopes }: PostLoginContext) => {
    if (!wantsOrganization(scopes)) return undefined;
    const organizationId = await activeOrganizationFor(user.id, session);
    // El plugin pide fallar aquí si el scope exige referenceId y no lo hay.
    if (!organizationId) {
      throw new APIError("BAD_REQUEST", {
        error: "invalid_request",
        error_description:
          "Select an organization linked to this application to continue",
      });
    }
    return organizationId;
  },
};

export const organizationClaims: OAuthProviderExtension = {
  claims: {
    accessToken: async ({ user, client, scopes, referenceId }) => {
      if (!user || !referenceId || !wantsOrganization(scopes)) {
        return {};
      }
      // Re-valida al emitir (también en refresh): si la app se desvinculó o
      // el usuario salió de la org, el token sale sin claims de organización.
      const access = await resolveOrganizationAccess(
        user.id,
        client.clientId,
        referenceId,
      );
      if (!access) return {};
      return {
        org_id: access.organizationId,
        org_role: access.role,
        permissions: access.permissions,
      };
    },
    // Userinfo repite lo que ya trae el access token (para el perfil de la app).
    userInfo: ({ jwt }) =>
      typeof jwt.org_id === "string"
        ? { org_id: jwt.org_id, org_role: jwt.org_role, permissions: jwt.permissions }
        : {},
  },
};
