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
  logger: String(env.BETTER_AUTH_DATABASE_DEBUG) === "true",
  connection: {
    max: 1,
    // La BD es remota: si la red corta la conexión (cambio de IP, NAT que
    // descarta conexiones inactivas) Bun SQL no lo detecta y cada consulta
    // espera para siempre sobre el socket muerto. Cerrarla al quedar inactiva
    // y limitar su vida obliga a abrir una nueva.
    idleTimeout: 30,
    maxLifetime: 60 * 10,
    connectionTimeout: 10,
    // String(): en `next build` t3-env no valida (skipValidation) y llegan
    // los strings crudos "false"/"true" — Bun SQL rechaza "false" como
    // sslmode y drizzle toma cualquier string como logger. Igual en `logger`.
    ssl: String(env.BETTER_AUTH_DATABASE_SSL) === "true",
    host: env.BETTER_AUTH_DATABASE_HOST,
    port: env.BETTER_AUTH_DATABASE_PORT,
    database: env.BETTER_AUTH_DATABASE_NAME,
    user: env.BETTER_AUTH_DATABASE_USER,
    password: env.BETTER_AUTH_DATABASE_PASS,
  },
});
