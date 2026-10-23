import { betterAuthServer as auth } from "@/lib/auth/server";
import { drizzlePostgreClient as db } from "@/database/clients/postgre";
import { oauthConsents, oauthClients, users } from "@/database/schema";
import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;

  const rows = await db
    .select({
      id: oauthConsents.id,
      clientId: oauthConsents.clientId,
      clientName: oauthClients.name,
      userId: oauthConsents.userId,
      scopes: oauthConsents.scopes,
      createdAt: oauthConsents.createdAt,
      updatedAt: oauthConsents.updatedAt,
    })
    .from(oauthConsents)
    .leftJoin(oauthClients, eq(oauthConsents.clientId, oauthClients.clientId))
    .where(eq(oauthConsents.userId, userId))
    .orderBy(desc(oauthConsents.createdAt));

  return Response.json(rows);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  const body = (await request.json()) as {
    clientId?: string;
    scopes?: string[];
  };

  if (!body.clientId || !Array.isArray(body.scopes)) {
    return Response.json({ error: "missing fields" }, { status: 400 });
  }

  const user = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user.length) {
    return Response.json({ error: "user not found" }, { status: 404 });
  }

  const client = await db
    .select({ clientId: oauthClients.clientId })
    .from(oauthClients)
    .where(eq(oauthClients.clientId, body.clientId))
    .limit(1);
  if (!client.length) {
    return Response.json({ error: "client not found" }, { status: 404 });
  }

  const now = new Date();
  const [created] = await db
    .insert(oauthConsents)
    .values({
      id: crypto.randomUUID(),
      clientId: body.clientId,
      userId,
      scopes: body.scopes,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: oauthConsents.id,
      clientId: oauthConsents.clientId,
      userId: oauthConsents.userId,
      scopes: oauthConsents.scopes,
      createdAt: oauthConsents.createdAt,
      updatedAt: oauthConsents.updatedAt,
    });

  return Response.json(created, { status: 201 });
}
