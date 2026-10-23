import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { pushSchema } from "drizzle-kit/payload/sqlite";

import * as schemaSqlite from "@/database/schema-sqlite";
import * as schemaAppSqlite from "@/database/schema-app-sqlite";
import { relations } from "@/database/relations-sqlite";

/**
 * Test DB: SQLite en memoria (bun:sqlite nativo, sin infra).
 *
 * ponytail: reemplaza la conexión PG de `tests/database.ts` que apuntaba a la
 * misma DB que dev/prod — los tests creaban usuarios reales y cleanupTestDb()
 * podía truncarla. SQLite en memoria: aislado total, y `pushSchema`
 * (drizzle-kit/payload/sqlite) crea las tablas desde schema-sqlite.ts sin DDL manual.
 */

const sqlite = new Database(":memory:");
sqlite.exec("PRAGMA foreign_keys = ON;");

export const testDb = drizzle({ client: sqlite, relations });

let initialized: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  // ponytail: memo — push corre una vez por proceso de tests. Re-crear más
  // veces en bun --watch fallaría por schema ya aplicado; al reiniciar el
  // proceso se re-crea todo (in-memory se pierde).
  initialized ??= (async () => {
    // ponytail: drizzle-kit 1.x ya no recibe una instancia drizzle sino un
    // cliente mínimo { query, run, batch } — se arma sobre bun:sqlite.
    const { apply } = await pushSchema(
      { ...schemaSqlite, ...schemaAppSqlite },
      {
        query: async (q, params = []) =>
          sqlite.query(q).all(...params) as never,
        run: async (q) => void sqlite.run(q),
        batch: async (qs) => qs.forEach((q) => sqlite.run(q)),
      },
    );
    await apply();
  })();
  return initialized;
}

// Orden hojas → raíces: respeta FKs onDelete cascade (borrar hijos primero).
const TABLES = [
  "verifications",
  "jwkss",
  "device_codes",
  "oauth_client_assertions",
  "apikeys",
  "two_factors",
  "passkeys",
  "oauth_consents",
  "oauth_access_tokens",
  "oauth_refresh_tokens",
  "oauth_client_resources",
  "oauth_resources",
  "oauth_clients",
  "sessions",
  "accounts",
  "invitations",
  "organization_roles",
  "members",
  "organizations",
  "users",
] as const;

/**
 * Limpia todas las filas sin tocar el esquema (equivalente del TRUNCATE PG).
 * No respeta BETTER_AUTH_TEST_ALLOW_TRUNCATE: nunca es la DB de dev.
 */
export async function cleanupTestDb() {
  await ensureSchema();
  for (const t of TABLES) sqlite.exec(`DELETE FROM ${t};`);
}

export async function closeTestDb() {
  sqlite.close();
}

// ponytail: top-level await — garantiza tablas listas antes de que cualquier
// test consulte testDb (evita depender de que cada test llame cleanupTestDb).
await ensureSchema();
