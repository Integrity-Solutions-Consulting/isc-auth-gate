import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { oauthClients, organizations } from "./schema";

// Tablas propias de la app (no las genera `auth:generate`, que reescribe
// schema.ts). Mirror SQLite para tests en schema-app-sqlite.ts — mantener en
// sync.

/**
 * Organizaciones en las que una app OAuth puede usarse. El usuario elige una
 * de ellas al iniciar sesión (postLogin) y el access token lleva su rol y
 * permisos en esa organización. Distinto de `oauth_clients.reference_id`, que
 * es la organización dueña (quién administra la app).
 */
export const oauthClientOrganizations = pgTable(
  "oauth_client_organizations",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClients.clientId, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("oauthClientOrganizations_clientId_organizationId_uidx").on(
      table.clientId,
      table.organizationId,
    ),
    index("oauthClientOrganizations_organizationId_idx").on(
      table.organizationId,
    ),
  ],
);
