import { betterAuthServer as auth } from "@/lib/auth/server";
import { drizzlePostgreClient } from "@/database/clients/postgre";
import { oauthClientResources } from "@/database/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

// El plugin no expone "resources vinculados a un client" (sólo link/unlink,
// en /api/admin/resources/[identifier]/clients/[clientId]): se lee la tabla.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { clientId } = await params;
  try {
    const rows = await drizzlePostgreClient
      .select({ resourceId: oauthClientResources.resourceId })
      .from(oauthClientResources)
      .where(eq(oauthClientResources.clientId, clientId));
    return Response.json(rows.map((row) => row.resourceId));
  } catch (error) {
    console.error("[resources] list client resources:", error);
    return Response.json(
      { error: "Failed to list client resources" },
      { status: 500 },
    );
  }
}
