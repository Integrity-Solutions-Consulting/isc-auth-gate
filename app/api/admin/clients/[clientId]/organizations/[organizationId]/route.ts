import { drizzlePostgreClient as db } from "@/database/clients/postgre";
import { oauthClients, organizations } from "@/database/schema";
import { oauthClientOrganizations } from "@/database/schema-app";
import { and, eq } from "drizzle-orm";
import { errorResponse, requireAdmin } from "../../../../helpers";

type Params = { params: Promise<{ clientId: string; organizationId: string }> };

// Vincula/desvincula una app con una organización. Idempotente.
export async function POST(_request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { clientId, organizationId } = await params;
  try {
    const [[client], [organization]] = await Promise.all([
      db
        .select({ id: oauthClients.id })
        .from(oauthClients)
        .where(eq(oauthClients.clientId, clientId))
        .limit(1),
      db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1),
    ]);
    if (!client) {
      return Response.json({ error: `client ${clientId} not found` }, { status: 404 });
    }
    if (!organization) {
      return Response.json(
        { error: `organization ${organizationId} not found` },
        { status: 404 },
      );
    }
    const inserted = await db
      .insert(oauthClientOrganizations)
      .values({ id: crypto.randomUUID(), clientId, organizationId })
      .onConflictDoNothing()
      .returning({ id: oauthClientOrganizations.id });
    return Response.json({ linked: true, alreadyLinked: inserted.length === 0 });
  } catch (error) {
    return errorResponse(error, "Failed to link organization");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { clientId, organizationId } = await params;
  try {
    await db
      .delete(oauthClientOrganizations)
      .where(
        and(
          eq(oauthClientOrganizations.clientId, clientId),
          eq(oauthClientOrganizations.organizationId, organizationId),
        ),
      );
    return Response.json({ unlinked: true });
  } catch (error) {
    return errorResponse(error, "Failed to unlink organization");
  }
}
