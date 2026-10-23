import { betterAuthServer as auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { errorResponse, requireAdmin } from "../../helpers";

type Params = { params: Promise<{ identifier: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { identifier } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  try {
    const updated = await auth.api.adminUpdateOAuthResource({
      headers: await headers(),
      params: { identifier },
      body,
    });
    return Response.json(updated);
  } catch (error) {
    return errorResponse(error, "Failed to update resource");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { identifier } = await params;
  try {
    const deleted = await auth.api.adminDeleteOAuthResource({
      headers: await headers(),
      params: { identifier },
    });
    return Response.json(deleted);
  } catch (error) {
    return errorResponse(error, "Failed to delete resource");
  }
}
