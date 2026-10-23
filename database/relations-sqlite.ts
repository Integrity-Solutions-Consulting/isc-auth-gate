import { defineRelations } from "drizzle-orm";
import * as schema from "./schema-sqlite";

// Relations — misma estructura que relations.ts (dialect-agnostic).
export const relations = defineRelations(schema, (r) => ({
  users: {
    sessions: r.many.sessions(),
    accounts: r.many.accounts(),
    members: r.many.members(),
    invitations: r.many.invitations(),
    oauthClients: r.many.oauthClients(),
    oauthRefreshTokens: r.many.oauthRefreshTokens(),
    oauthAccessTokens: r.many.oauthAccessTokens(),
    oauthConsents: r.many.oauthConsents(),
    twoFactors: r.many.twoFactors(),
  },
  sessions: {
    user: r.one.users({
      from: r.sessions.userId,
      to: r.users.id,
    }),
    oauthRefreshTokens: r.many.oauthRefreshTokens(),
    oauthAccessTokens: r.many.oauthAccessTokens(),
  },
  accounts: {
    user: r.one.users({
      from: r.accounts.userId,
      to: r.users.id,
    }),
  },
  organizations: {
    organizationRoles: r.many.organizationRoles(),
    members: r.many.members(),
    invitations: r.many.invitations(),
  },
  organizationRoles: {
    organization: r.one.organizations({
      from: r.organizationRoles.organizationId,
      to: r.organizations.id,
    }),
  },
  members: {
    organization: r.one.organizations({
      from: r.members.organizationId,
      to: r.organizations.id,
    }),
    user: r.one.users({
      from: r.members.userId,
      to: r.users.id,
    }),
  },
  invitations: {
    organization: r.one.organizations({
      from: r.invitations.organizationId,
      to: r.organizations.id,
    }),
    user: r.one.users({
      from: r.invitations.inviterId,
      to: r.users.id,
    }),
  },
  oauthClients: {
    user: r.one.users({
      from: r.oauthClients.userId,
      to: r.users.id,
    }),
    oauthClientResources: r.many.oauthClientResources(),
    oauthRefreshTokens: r.many.oauthRefreshTokens(),
    oauthAccessTokens: r.many.oauthAccessTokens(),
    oauthConsents: r.many.oauthConsents(),
  },
  oauthResources: {
    oauthClientResources: r.many.oauthClientResources(),
  },
  oauthClientResources: {
    oauthClient: r.one.oauthClients({
      from: r.oauthClientResources.clientId,
      to: r.oauthClients.clientId,
    }),
    oauthResource: r.one.oauthResources({
      from: r.oauthClientResources.resourceId,
      to: r.oauthResources.identifier,
    }),
  },
  oauthRefreshTokens: {
    oauthClient: r.one.oauthClients({
      from: r.oauthRefreshTokens.clientId,
      to: r.oauthClients.clientId,
    }),
    session: r.one.sessions({
      from: r.oauthRefreshTokens.sessionId,
      to: r.sessions.id,
    }),
    user: r.one.users({
      from: r.oauthRefreshTokens.userId,
      to: r.users.id,
    }),
    oauthAccessTokens: r.many.oauthAccessTokens(),
  },
  oauthAccessTokens: {
    oauthClient: r.one.oauthClients({
      from: r.oauthAccessTokens.clientId,
      to: r.oauthClients.clientId,
    }),
    session: r.one.sessions({
      from: r.oauthAccessTokens.sessionId,
      to: r.sessions.id,
    }),
    user: r.one.users({
      from: r.oauthAccessTokens.userId,
      to: r.users.id,
    }),
    oauthRefreshToken: r.one.oauthRefreshTokens({
      from: r.oauthAccessTokens.refreshId,
      to: r.oauthRefreshTokens.id,
    }),
  },
  oauthConsents: {
    oauthClient: r.one.oauthClients({
      from: r.oauthConsents.clientId,
      to: r.oauthClients.clientId,
    }),
    user: r.one.users({
      from: r.oauthConsents.userId,
      to: r.users.id,
    }),
  },
  twoFactors: {
    user: r.one.users({
      from: r.twoFactors.userId,
      to: r.users.id,
    }),
  },
  apikeys: {
    user: r.one.users({
      from: r.apikeys.referenceId,
      to: r.users.id,
    }),
  },
}));
