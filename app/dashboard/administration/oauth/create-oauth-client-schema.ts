import { z } from "zod";

// ==========================================
// 1. Información General y Metadatos del Cliente
// ==========================================
export const clientMetadataSchema = z.object({
  client_name: z
    .string()
    .trim()
    .min(1, "El nombre del cliente es requerido")
    .max(100),
  client_uri: z.url().max(500).optional(),
  logo_uri: z.url().max(500).optional(),
  contacts: z.array(z.email().max(254)).max(10).optional(),
  tos_uri: z.url().max(500).optional(),
  policy_uri: z.url().max(500).optional(),
  software_id: z
    .string()
    .trim()
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/,
      "Formato inválido, ej: com.isc.testapp",
    )
    .max(255)
    .optional(),
  software_version: z
    .string()
    .regex(
      /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/,
      { message: "Versión SemVer inválida (ejemplo válido: 1.0.0)" },
    )
    .optional(),
  software_statement: z.string().max(4096).optional(),
  metadata: z
    .record(z.string(), z.unknown())
    .refine(
      (record) => Object.keys(record).length <= 50,
      "Máximo 50 claves en metadatos",
    )
    .optional(),
});

// ==========================================
// 2. Configuración de URIs y Redirecciones
// ==========================================
export const clientUrisSchema = z.object({
  redirect_uris: z
    .array(z.url().max(500))
    // .min(1, "Al menos una Redirect URI es requerida")
    .optional(),
  post_logout_redirect_uris: z.array(z.url().max(500)).optional(),
});

// ==========================================
// 3. Protocolo OAuth2, Autenticación y Seguridad
// ==========================================
export const clientOAuthConfigSchema = z.object({
  scope: z
    .string()
    .trim()
    // RFC 6749 §3.3: scope-token = 1*( %x21 / %x23-5B / %x5D-7E ) — ASCII
    // visible salvo espacio, `"` y `\`. Admite `todo:read`, URIs, etc.
    .regex(
      /^[\x21\x23-\x5B\x5D-\x7E]+(?: [\x21\x23-\x5B\x5D-\x7E]+)*$/,
      'Scopes separados por un espacio (sin comillas ni "\\")',
    )
    .max(1024)
    .optional(),
  token_endpoint_auth_method: z
    .enum(["none", "client_secret_basic", "client_secret_post"])
    .default("client_secret_basic")
    .optional(),
  grant_types: z
    .array(
      z.enum([
        "authorization_code",
        "client_credentials",
        "refresh_token",
        "urn:ietf:params:oauth:grant-type:device_code",
      ]),
    )
    .min(1)
    .default(["authorization_code"])
    .optional(),
  response_types: z
    .array(z.enum(["code"]))
    .min(1)
    .default(["code"])
    .optional(),
  application_type: z.enum(["web", "native"]).optional(),
  resources: z.array(z.string().min(1)).optional(),
  client_secret_expires_at: z
    .union([z.number().int().nonnegative(), z.string()])
    .optional()
    .default(0),
  skip_consent: z.boolean().optional(),
  enable_end_session: z.boolean().optional(),
  require_pkce: z.boolean().optional(),
  subject_type: z.enum(["public", "pairwise"]).optional(),
});

// ==========================================
// Esquema Principal Unificado (Create OAuth Client Body)
// ==========================================
export const createOAuthClientDataSchema = clientMetadataSchema
  .extend(clientUrisSchema.shape)
  .extend(clientOAuthConfigSchema.shape);

export type CreateOAuthClientData = z.input<typeof createOAuthClientDataSchema>;
