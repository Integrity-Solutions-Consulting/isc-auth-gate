import { betterAuthServer as auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { errorResponse, isUniqueViolation, requireAdmin } from "../../../../helpers";

// Con enforcePerClientResources (default true) un cliente sin este vínculo
// no puede pedir tokens para el resource.

type Params = { params: Promise<{ identifier: string; clientId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { identifier, clientId } = await params;
  try {
    const linked = await auth.api.adminLinkClientResource({
      headers: await headers(),
      params: { identifier, client_id: clientId },
    });
    return Response.json(linked);
  } catch (error) {
    // ponytail: el plugin detecta el duplicado mirando el message, que
    // drizzle 1.x envuelve — se resuelve aquí para que vincular sea idempotente.
    if (isUniqueViolation(error)) {
      return Response.json({ linked: true, alreadyLinked: true });
    }
    return errorResponse(error, "Failed to link client");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { identifier, clientId } = await params;
  try {
    const unlinked = await auth.api.adminUnlinkClientResource({
      headers: await headers(),
      params: { identifier, client_id: clientId },
    });
    return Response.json(unlinked);
  } catch (error) {
    return errorResponse(error, "Failed to unlink client");
  }
}
