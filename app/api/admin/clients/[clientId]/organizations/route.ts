import { drizzlePostgreClient as db } from "@/database/clients/postgre";
import { organizations } from "@/database/schema";
import { listClientOrganizationIds } from "@/lib/oauth-organizations";
import { errorResponse, requireAdmin } from "../../../helpers";

type Params = { params: Promise<{ clientId: string }> };

/**
 * Todas las organizaciones con `linked` = la app puede usarse en ella
 * (oauth_client_organizations). Ver lib/oauth-organizations.ts.
 */
export async function GET(_request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { clientId } = await params;
  try {
    const [all, linkedIds] = await Promise.all([
      db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          logo: organizations.logo,
        })
        .from(organizations)
        .orderBy(organizations.name),
      listClientOrganizationIds(clientId),
    ]);
    const linked = new Set(linkedIds);
    return Response.json(all.map((org) => ({ ...org, linked: linked.has(org.id) })));
  } catch (error) {
    return errorResponse(error, "Failed to list client organizations");
  }
}
