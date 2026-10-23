import { z } from "zod";
import { OAuthResourceInput } from "@better-auth/oauth-provider";

// Mirror de resourceBodySchema del plugin oauth-provider (OAuthResourceInput).
// allowedScopes y metadata se editan como texto (comma-separated / JSON) y se
// transforman al payload de la API al enviar. Los TTL se manejan como string
// en el form y se convierten con Number() en toResourceInput.
export const resourceFormSchema = z.object({
  identifier: z.string().min(1, "Identifier es requerido"),
  name: z.string().optional(),
  allowedScopes: z.string().optional(),
  accessTokenTtl: z
    .string()
    .optional()
    .refine((v) => !v || /^\d+$/.test(v), "Debe ser un número entero"),
  refreshTokenTtl: z
    .string()
    .optional()
    .refine((v) => !v || /^\d+$/.test(v), "Debe ser un número entero"),
  dpopBoundAccessTokensRequired: z.boolean().default(false),
  disabled: z.boolean().default(false),
  metadata: z.string().optional(),
});

export type ResourceFormData = z.input<typeof resourceFormSchema>;

/** "a, b ,c" → ["a", "b", "c"] (el form edita allowedScopes como texto). */
export const parseAllowedScopes = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export const toResourceInput = (data: ResourceFormData): OAuthResourceInput => {
  const input: OAuthResourceInput = { identifier: data.identifier };
  if (data.name) input.name = data.name;
  if (data.allowedScopes) {
    input.allowedScopes = parseAllowedScopes(data.allowedScopes);
  }
  if (data.accessTokenTtl) input.accessTokenTtl = Number(data.accessTokenTtl);
  if (data.refreshTokenTtl) input.refreshTokenTtl = Number(data.refreshTokenTtl);
  input.dpopBoundAccessTokensRequired = data.dpopBoundAccessTokensRequired;
  input.disabled = data.disabled;
  if (data.metadata) {
    input.metadata = JSON.parse(data.metadata) as Record<string, unknown>;
  }
  return input;
};