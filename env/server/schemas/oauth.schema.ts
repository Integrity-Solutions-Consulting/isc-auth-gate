import { z } from "zod";
import { createEnv } from "@t3-oss/env-nextjs";

export const oAuthEnviroment = createEnv({
  server: {
    BETTER_AUTH_OAUTH_DYNAMIC_CLIENT_REGISTRATION: z.stringbool().default(false),
    // client_ids de primera parte (trusted) — inmutables vía CRUD del plugin.
    // Lista separada por comas; espejo en NEXT_PUBLIC_BETTER_AUTH_OAUTH_TRUSTED_CLIENTS.
    // ponytail: array, no string — `new Set("abc")` es un Set de caracteres.
    BETTER_AUTH_OAUTH_TRUSTED_CLIENTS: z.preprocess(
      (val) =>
        typeof val === "string" ? val.split(",").map((s) => s.trim()) : val,
      z.array(z.string().min(1)).default(["isc-gate-dashboard"]),
    ),
    // Scopes propios (p. ej. todo:read) que se suman a openid/profile/email/
    // offline_access. create-client rechaza cualquier scope que no esté en la
    // lista del plugin ("cannot request scope ..."). Separados por comas.
    BETTER_AUTH_OAUTH_SCOPES: z.preprocess(
      (val) =>
        typeof val === "string"
          ? val.split(",").map((s) => s.trim()).filter(Boolean)
          : val,
      z.array(z.string().regex(/^[\x21\x23-\x5B\x5D-\x7E]+$/)).default([]),
    ),
    // Recursos protegidos (RFC 8707): JSON con { identifier, name?,
    // allowedScopes? }[]. Seed de bootstrap (insertOnly); la fuente de verdad
    // es la tabla oauth_resources, gestionada desde el dashboard admin.
    BETTER_AUTH_OAUTH_RESOURCES: z.preprocess(
      (val) => {
        if (typeof val !== "string") return val;
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      },
      z
        .array(
          z.object({
            identifier: z.string(),
            name: z.string().optional(),
            allowedScopes: z.array(z.string()).optional(),
          }),
        )
        .default([]),
    ),
  },
  experimental__runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: process.env.NEXT_PHASE === "phase-production-build",
  isServer: typeof window === "undefined",
});
