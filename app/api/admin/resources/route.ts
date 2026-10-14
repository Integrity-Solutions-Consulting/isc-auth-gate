import { betterAuthServer as auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { errorResponse, isUniqueViolation, requireAdmin } from "../helpers";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const resources = await auth.api.adminListOAuthResources({
      headers: await headers(),
    });
    return Response.json(resources);
  } catch (error) {
    return errorResponse(error, "Failed to list resources");
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  if (!body || !body.identifier) {
    return Response.json({ error: "identifier is required" }, { status: 400 });
  }
  try {
    const created = await auth.api.adminCreateOAuthResource({
      headers: await headers(),
      body,
    });
    return Response.json(created, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return Response.json(
        { error: `resource ${body.identifier} already exists` },
        { status: 409 },
      );
    }
    return errorResponse(error, "Failed to create resource");
  }
}
