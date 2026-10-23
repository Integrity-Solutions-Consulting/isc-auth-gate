import { betterAuthServer as auth } from "@/lib/auth/server";
import { drizzlePostgreClient as db } from "@/database/clients/postgre";
import { oauthConsents } from "@/database/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET(_request: Request,{ params }: { params: Promise<{ userId: string; consentId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, consentId } = await params;

  const rows = await db
    .select()
    .from(oauthConsents)
    .where(
      eq(oauthConsents.id, consentId) &&
        eq(oauthConsents.userId, userId),
    )
    .limit(1);

  if (!rows.length) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return Response.json(rows[0]);
}

export async function PATCH(request: Request,{ params }: { params: Promise<{ userId: string; consentId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, consentId } = await params;
  const body = (await request.json()) as { scopes?: string[] };

  if (!Array.isArray(body.scopes)) {
    return Response.json({ error: "missing scopes" }, { status: 400 });
  }

  const [updated] = await db
    .update(oauthConsents)
    .set({ scopes: body.scopes, updatedAt: new Date() })
    .where(
      eq(oauthConsents.id, consentId) &&
        eq(oauthConsents.userId, userId),
    )
    .returning({
      id: oauthConsents.id,
      clientId: oauthConsents.clientId,
      userId: oauthConsents.userId,
      scopes: oauthConsents.scopes,
      createdAt: oauthConsents.createdAt,
      updatedAt: oauthConsents.updatedAt,
    });

  if (!updated) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return Response.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string; consentId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, consentId } = await params;

  await db
    .delete(oauthConsents)
    .where(
      eq(oauthConsents.id, consentId) &&
        eq(oauthConsents.userId, userId),
    );

  return Response.json({ success: true });
}
