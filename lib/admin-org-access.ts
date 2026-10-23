import { headers } from "next/headers";
import { drizzlePostgreClient as db } from "@/database/clients/postgre";
import { members as member } from "@/database/schema";
import { betterAuthServer as auth } from "@/lib/auth/server";
import { eq, and } from "drizzle-orm";

/**
 * Run an action as org admin by temporarily joining the org if not a member.
 *
 * Better Auth org API requires the caller to be an org member. Server actions
 * called by global admins may target orgs they don't belong to. This helper
 * temporarily inserts a membership, runs the action, then cleans up.
 *
 * @throws If session user is not a global admin
 */
export async function withOrgAdminAccess<T>(
  orgId: string,
  action: (ctx: { auth: typeof auth; headers: Headers }) => Promise<T>,
): Promise<T> {
  const h = await headers();

  const session = await auth.api.getSession({ headers: h });
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }

  const [existing] = await db
    .select({ id: member.id })
    .from(member)
    .where(
      and(
        eq(member.organizationId, orgId),
        eq(member.userId, session.user.id),
      ),
    )
    .limit(1);

  const alreadyMember = !!existing;

  if (!alreadyMember) {
    await db.insert(member).values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      userId: session.user.id,
      role: "systemAdmin",
      createdAt: new Date(),
    });
  }

  try {
    return await action({ auth, headers: h });
  } finally {
    if (!alreadyMember) {
      await db
        .delete(member)
        .where(
          and(
            eq(member.organizationId, orgId),
            eq(member.userId, session.user.id),
          ),
        );
    }
  }
}
