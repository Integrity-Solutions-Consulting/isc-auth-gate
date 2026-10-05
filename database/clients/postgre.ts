import { env } from "@/env/server";
import { drizzle } from "drizzle-orm/bun-sql";
import { relations } from "../relations";

// TODO(better-drizzle): 0.2.x no soporta drizzle-orm 1.x (rompe al importar:
// "Export named 'normalizeRelation' not found"). Al publicarse 0.3.0 en npm:
//   export const client = better(drizzlePostgreClient);
// 0.3.0 lee tablas y relaciones de `db._.relations`; ya no recibe `schema`.
// Sigue en https://github.com/almeidazs/better-drizzle/releases/tag/v0.3.0
export const drizzlePostgreClient = drizzle({
  relations,
  logger: env.BETTER_AUTH_DATABASE_DEBUG,
  connection: {
    max: 1,
    ssl: env.BETTER_AUTH_DATABASE_SSL,
    host: env.BETTER_AUTH_DATABASE_HOST,
    port: env.BETTER_AUTH_DATABASE_PORT,
    database: env.BETTER_AUTH_DATABASE_NAME,
    user: env.BETTER_AUTH_DATABASE_USER,
    password: env.BETTER_AUTH_DATABASE_PASS,
  },
});
