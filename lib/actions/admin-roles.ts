"use server";

import { headers } from "next/headers";
import { drizzlePostgreClient as db } from "@/database/clients/postgre";
import { organizations } from "@/database/schema";
import { betterAuthServer as auth } from "@/lib/auth/server";
import { withOrgAdminAccess } from "@/lib/admin-org-access";

/**
 * Server actions for dynamic org role CRUD.
 *
 * Wraps Better Auth org API endpoints with admin authorization.
 * Only global admin users can create/update/delete org-scoped roles.
 * Uses withOrgAdminAccess to temporarily join the target org.
 *
 * @see lib/admin-org-access.ts
 */

export async function listAllOrganizationsAction() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }

  const orgs = await db.select().from(organizations);
  return orgs.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    logo: org.logo,
    createdAt: org.createdAt,
    role: "admin" as const,
  }));
}

export async function listOrgRolesAction(orgId: string) {
  return withOrgAdminAccess(orgId, async ({ auth, headers }) => {
    return auth.api.listOrgRoles({ headers, query: { organizationId: orgId } });
  });
}

export async function createOrgRoleAction(
  orgId: string,
  role: string,
  permission: Record<string, string[]>,
) {
  return withOrgAdminAccess(orgId, async ({ auth, headers }) => {
    return auth.api.createOrgRole({
      headers,
      body: { organizationId: orgId, role, permission },
    });
  });
}

export async function updateOrgRoleAction(
  orgId: string,
  roleName: string,
  data: { permission?: Record<string, string[]>; roleName?: string },
) {
  return withOrgAdminAccess(orgId, async ({ auth, headers }) => {
    return auth.api.updateOrgRole({
      headers,
      body: { organizationId: orgId, roleName, data },
    });
  });
}

export async function deleteOrgRoleAction(orgId: string, roleId: string) {
  return withOrgAdminAccess(orgId, async ({ auth, headers }) => {
    return auth.api.deleteOrgRole({
      headers,
      body: { organizationId: orgId, roleId },
    });
  });
}
