"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { drizzlePostgreClient as db } from "@/database/clients/postgre";
import { oauthClients, organizations, users } from "@/database/schema";
import { betterAuthServer as auth } from "@/lib/auth/server";

/**
 * Read-only cross-org listing of every registered OAuth client for the
 * global admin overview. `referenceId` = organizationId (org-scoped app),
 * null = platform app owned by the user in `userId`.
 */
export async function listAllOauthClientsAction() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }

  const rows = await db
    .select({
      clientId: oauthClients.clientId,
      name: oauthClients.name,
      icon: oauthClients.icon,
      disabled: oauthClients.disabled,
      createdAt: oauthClients.createdAt,
      referenceId: oauthClients.referenceId,
      userId: oauthClients.userId,
      orgName: organizations.name,
      ownerEmail: users.email,
    })
    .from(oauthClients)
    .leftJoin(organizations, eq(oauthClients.referenceId, organizations.id))
    .leftJoin(users, eq(oauthClients.userId, users.id))
    .orderBy(oauthClients.createdAt);

  return rows;
}
