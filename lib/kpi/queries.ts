import { drizzlePostgreClient as db } from "@/database/clients/postgre";
import {
  users,
  sessions,
  accounts,
  oauthClients,
  oauthAccessTokens,
  oauthConsents,
} from "@/database/schema";
import { count, eq, gte, isNull, and, desc } from "drizzle-orm";
import type { KpiSummary } from "./types";

const PROVIDER_LABELS: Record<string, string> = {
  microsoft: "Microsoft 365",
  "microsoft-entra-id": "Microsoft 365",
  credential: "Correo y Contraseña",
  email: "Correo Electrónico",
  username: "Usuario y Clave",
  passkey: "Passkey / Biometría",
  "phone-number": "SMS / Teléfono",
};

function categorizeProvider(providerId: string): "oauth" | "password" | "passkey" | "other" {
  if (providerId === "microsoft" || providerId === "microsoft-entra-id") return "oauth";
  if (providerId === "credential" || providerId === "email" || providerId === "username")
    return "password";
  if (providerId === "passkey") return "passkey";
  return "other";
}

export async function getOAuthClientsList() {
  const clients = await db
    .select({
      clientId: oauthClients.clientId,
      name: oauthClients.name,
    })
    .from(oauthClients);

  return clients.map((c) => ({
    clientId: c.clientId,
    name: c.name || c.clientId,
  }));
}

export async function getKpiSummary(selectedClientId?: string): Promise<KpiSummary> {
  const now = new Date();
  const date7dAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const date30dAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let clientName: string | undefined = undefined;
  if (selectedClientId) {
    const client = await db
      .select({ name: oauthClients.name })
      .from(oauthClients)
      .where(eq(oauthClients.clientId, selectedClientId))
      .limit(1);
    if (client.length > 0) {
      clientName = client[0].name || selectedClientId;
    }
  }

  // Scoped user IDs when filtering by a single OAuth client (via consents)
  let targetUserIds: string[] | null = null;
  if (selectedClientId) {
    const consents = await db
      .select({ userId: oauthConsents.userId })
      .from(oauthConsents)
      .where(eq(oauthConsents.clientId, selectedClientId));
    targetUserIds = consents
      .map((c) => c.userId)
      .filter((id): id is string => Boolean(id));
  }

  const allUsers = await db
    .select({
      id: users.id,
      emailVerified: users.emailVerified,
      twoFactorEnabled: users.twoFactorEnabled,
      banned: users.banned,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users);

  const filteredUsers =
    targetUserIds !== null
      ? allUsers.filter((u) => targetUserIds!.includes(u.id))
      : allUsers;

  const userStats = {
    total: filteredUsers.length,
    verified: filteredUsers.filter((u) => u.emailVerified).length,
    twoFactorEnabled: filteredUsers.filter((u) => u.twoFactorEnabled).length,
    banned: filteredUsers.filter((u) => u.banned).length,
    new7d: filteredUsers.filter((u) => u.createdAt >= date7dAgo).length,
    new30d: filteredUsers.filter((u) => u.createdAt >= date30dAgo).length,
  };

  const roleMap = new Map<string, number>();
  for (const u of filteredUsers) {
    const role = u.role ?? "user";
    roleMap.set(role, (roleMap.get(role) ?? 0) + 1);
  }
  const roleBreakdown = Array.from(roleMap.entries()).map(([role, count]) => ({
    role,
    count,
  }));

  const verifiedCount = filteredUsers.filter((u) => u.emailVerified).length;
  const verificationBreakdown = [
    { name: "Verified", value: verifiedCount },
    { name: "Pending", value: filteredUsers.length - verifiedCount },
  ];

  // Login methods (global — not scoped by client, reflects IdP config)
  const accountsRaw = await db
    .select({ providerId: accounts.providerId, count: count() })
    .from(accounts)
    .groupBy(accounts.providerId);

  const loginMethods = accountsRaw.map((a) => ({
    providerId: a.providerId,
    label: PROVIDER_LABELS[a.providerId] || a.providerId,
    count: a.count,
  }));

  // Active sessions
  const activeSessionsRaw = await db
    .select({ userAgent: sessions.userAgent })
    .from(sessions)
    .where(gte(sessions.expiresAt, now));

  let desktopCount = 0;
  let mobileCount = 0;
  let otherCount = 0;
  for (const s of activeSessionsRaw) {
    const ua = (s.userAgent || "").toLowerCase();
    if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
      mobileCount++;
    } else if (
      ua.includes("mozilla") ||
      ua.includes("chrome") ||
      ua.includes("safari") ||
      ua.includes("windows") ||
      ua.includes("macintosh")
    ) {
      desktopCount++;
    } else {
      otherCount++;
    }
  }

  const sessionStats = {
    active: activeSessionsRaw.length,
    devices: [
      { type: "Escritorio / Web", count: desktopCount },
      { type: "Móvil", count: mobileCount },
      { type: "Otros / API", count: otherCount },
    ].filter((d) => d.count > 0),
  };

  // OAuth stats
  const totalClientsResult = await db.select({ value: count() }).from(oauthClients);

  const activeTokensConditions = [gte(oauthAccessTokens.expiresAt, now), isNull(oauthAccessTokens.revoked)];
  if (selectedClientId) {
    activeTokensConditions.push(eq(oauthAccessTokens.clientId, selectedClientId));
  }
  const activeTokensResult = await db
    .select({ value: count() })
    .from(oauthAccessTokens)
    .where(and(...activeTokensConditions));

  const consentConditions = selectedClientId
    ? [eq(oauthConsents.clientId, selectedClientId)]
    : [];
  const totalConsentsResult = await db
    .select({ value: count() })
    .from(oauthConsents)
    .where(consentConditions.length > 0 ? and(...consentConditions) : undefined);

  const topTokensRaw = await db
    .select({
      clientId: oauthAccessTokens.clientId,
      tokenCount: count(),
    })
    .from(oauthAccessTokens)
    .groupBy(oauthAccessTokens.clientId)
    .orderBy(desc(count()))
    .limit(5);

  const allClientsList = await getOAuthClientsList();
  const clientNameMap = new Map(allClientsList.map((c) => [c.clientId, c.name]));

  const topClients = topTokensRaw.map((t) => ({
    clientId: t.clientId,
    name: clientNameMap.get(t.clientId) || t.clientId,
    tokenCount: t.tokenCount,
  }));

  // Recent users (global, for the overview tab)
  const recentUsersRaw = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      twoFactorEnabled: users.twoFactorEnabled,
      banned: users.banned,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(10);

  // Active sessions with user info (for the sessions tab)
  const recentSessionsRaw = await db
    .select({
      id: sessions.id,
      userName: users.name,
      userEmail: users.email,
      ipAddress: sessions.ipAddress,
      userAgent: sessions.userAgent,
      expiresAt: sessions.expiresAt,
      createdAt: sessions.createdAt,
      impersonatedBy: sessions.impersonatedBy,
    })
    .from(sessions)
    .leftJoin(users, eq(sessions.userId, users.id))
    .where(gte(sessions.expiresAt, now))
    .orderBy(desc(sessions.createdAt))
    .limit(10);

  // Accounts with user status (for the security tab)
  const securityAccountsRaw = await db
    .select({
      userId: accounts.userId,
      userName: users.name,
      userEmail: users.email,
      providerId: accounts.providerId,
      banned: users.banned,
      emailVerified: users.emailVerified,
    })
    .from(accounts)
    .leftJoin(users, eq(accounts.userId, users.id))
    .orderBy(desc(accounts.createdAt))
    .limit(50);

  const securityAccounts = securityAccountsRaw.map((a) => ({
    userId: a.userId,
    userName: a.userName,
    userEmail: a.userEmail,
    providerId: a.providerId,
    category: categorizeProvider(a.providerId),
    banned: a.banned ?? false,
    emailVerified: a.emailVerified ?? false,
  }));

  return {
    clientId: selectedClientId,
    clientName,
    users: userStats,
    loginMethods,
    roleBreakdown,
    verificationBreakdown,
    sessions: sessionStats,
    oauth: {
      totalClients: totalClientsResult[0]?.value || 0,
      activeTokens: activeTokensResult[0]?.value || 0,
      totalConsents: totalConsentsResult[0]?.value || 0,
      topClients,
    },
    recentUsers: recentUsersRaw,
    recentSessions: recentSessionsRaw,
    securityAccounts,
  };
}
