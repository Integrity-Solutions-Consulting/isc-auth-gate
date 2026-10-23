// ponytail: variante relations-v2 — con drizzle-orm 1.x `db.query` es RQB v2
// (where/orderBy como objeto). El adapter por defecto arma callbacks v1 y
// rompe las consultas con `experimental.joins`.
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";

import { drizzlePostgreClient } from "@/database/clients/postgre";
import * as schema from "@/database/schema";

// ponytail: drizzleAdapter devuelve la factory del adapter (una función):
// va como valor de `database`, no esparcida — `{ ...fn }` es `{}` y Better
// Auth se quedaría sin base de datos.
export const BetterAuthDatabaseServerConfig = drizzleAdapter(
  drizzlePostgreClient,
  {
    provider: "pg",
    usePlural: true,
    // ponytail: obligatorio con drizzle 1.x — `drizzle({ relations })` ya no
    // expone `db._.fullSchema` y sin esto el adapter lanza "Schema not found".
    schema,
  },
);
