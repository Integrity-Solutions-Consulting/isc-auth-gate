import { and, eq, inArray } from "drizzle-orm";
import { drizzlePostgreClient as db } from "@/database/clients/postgre";
import { members, organizationRoles, organizations } from "@/database/schema";
import { oauthClientOrganizations } from "@/database/schema-app";
import { flattenAppPermissions, orgRoles } from "@/lib/permissions";

/**
 * Roles y permisos por aplicación OAuth, resueltos desde la organización.
 *
 * Una app (oauth client) se vincula a una o varias organizaciones
 * (oauth_client_organizations). Al iniciar sesión el usuario elige una de las
 * organizaciones que comparte con la app (postLogin → sesión
 * activeOrganizationId → referenceId del consentimiento) y el access token
 * lleva su rol y permisos en ella (claims org_id / org_role / permissions).
 */

/** Scope que pide una app para recibir los claims de organización. */
export const ORGANIZATION_SCOPE = "organization";

type Statements = Record<string, readonly string[]>;

/** `members.role` admite varios roles separados por coma. */
const splitRoles = (role: string) =>
  role
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

/** Organizaciones vinculadas a la app. */
export async function listClientOrganizationIds(
  clientId: string,
): Promise<string[]> {
  const rows = await db
    .select({ organizationId: oauthClientOrganizations.organizationId })
    .from(oauthClientOrganizations)
    .where(eq(oauthClientOrganizations.clientId, clientId));
  return rows.map((row) => row.organizationId);
}

export interface AllowedOrganization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  role: string;
}

/** Organizaciones donde el usuario es miembro Y la app está vinculada. */
export async function listAllowedOrganizations(
  userId: string,
  clientId: string,
): Promise<AllowedOrganization[]> {
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      logo: organizations.logo,
      role: members.role,
    })
    .from(members)
    .innerJoin(organizations, eq(organizations.id, members.organizationId))
    .innerJoin(
      oauthClientOrganizations,
      and(
        eq(oauthClientOrganizations.organizationId, members.organizationId),
        eq(oauthClientOrganizations.clientId, clientId),
      ),
    )
    .where(eq(members.userId, userId))
    .orderBy(organizations.name);
}

export interface OrganizationAccess {
  organizationId: string;
  role: string;
  permissions: string[];
}

/**
 * Rol y permisos de app del usuario en `organizationId` para `clientId`, o
 * null si la app no está vinculada a la organización o el usuario no es
 * miembro. Permisos = roles estáticos (lib/permissions.ts) ∪ roles dinámicos
 * de la organización (organization_roles, DAC).
 */
export async function resolveOrganizationAccess(
  userId: string,
  clientId: string,
  organizationId: string,
): Promise<OrganizationAccess | null> {
  const [membership] = await db
    .select({ role: members.role })
    .from(members)
    .innerJoin(
      oauthClientOrganizations,
      and(
        eq(oauthClientOrganizations.organizationId, members.organizationId),
        eq(oauthClientOrganizations.clientId, clientId),
      ),
    )
    .where(
      and(
        eq(members.userId, userId),
        eq(members.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!membership) return null;

  const roles = splitRoles(membership.role);
  const statementsList: Statements[] = [];
  for (const role of roles) {
    const staticRole = orgRoles[role as keyof typeof orgRoles];
    if (staticRole) statementsList.push(staticRole.statements);
  }
  if (roles.length) {
    const dynamicRoles = await db
      .select({ permission: organizationRoles.permission })
      .from(organizationRoles)
      .where(
        and(
          eq(organizationRoles.organizationId, organizationId),
          inArray(organizationRoles.role, roles),
        ),
      );
    for (const { permission } of dynamicRoles) {
      try {
        statementsList.push(JSON.parse(permission) as Statements);
      } catch {
        // ponytail: un permission corrupto no debe tumbar la emisión del token
      }
    }
  }

  return {
    organizationId,
    role: roles.join(","),
    permissions: flattenAppPermissions(statementsList),
  };
}
