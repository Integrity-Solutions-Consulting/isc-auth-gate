import { betterAuthServer as auth } from "@/lib/auth/server";
import { drizzlePostgreClient as db } from "@/database/clients/postgre";
import { oauthClients } from "@/database/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

// Better Auth nativo no expone el campo `disabled` en update-client, por eso
// este endpoint admin mínimo lo habilita/deshabilita directamente.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { clientId } = await params;
  const { disabled } = (await request.json()) as { disabled?: boolean };

  if (typeof disabled !== "boolean") {
    return Response.json({ error: "missing disabled" }, { status: 400 });
  }

  const updated = await db
    .update(oauthClients)
    .set({ disabled })
    .where(eq(oauthClients.clientId, clientId))
    .returning({ clientId: oauthClients.clientId, disabled: oauthClients.disabled });

  if (!updated.length) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return Response.json(updated[0]);
}
