import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { oauthClients, organizations } from "./schema-sqlite";

// Mirror SQLite (tests) de schema-app.ts — mantener en sync.
export const oauthClientOrganizations = sqliteTable(
  "oauth_client_organizations",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClients.clientId, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
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
