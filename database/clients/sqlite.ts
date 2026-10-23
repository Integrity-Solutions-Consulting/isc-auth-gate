import Database from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { relations } from "../relations-sqlite";

// ponytail: relations-sqlite, no ../relations — esas tablas son pg-core y
// mezclar dialectos corrompe los mappers de columnas (ver AGENTS.md).
// TODO(better-drizzle): ver la nota en ./postgre.ts; con 0.3.0:
//   export const client = better(drizzleSqliteClient);
export const drizzleSqliteClient = drizzle({
  client: new Database("app.db"),
  relations,
});
