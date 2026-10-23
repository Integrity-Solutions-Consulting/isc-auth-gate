import type { BetterAuthPlugin } from "better-auth";
import { createAuthMiddleware, isAPIError } from "better-auth/api";

/**
 * Traduce el `error_description` de los redirects de error del oauth-provider.
 *
 * El plugin i18n solo traduce `APIError` JSON con `code`; los errores de
 * /oauth2/authorize, /oauth2/consent… viajan como redirect al cliente
 * (`redirect_uri?error=…&error_description=…`) con textos fijos en inglés
 * (formatErrorURL/handleRedirect en @better-auth/oauth-provider). Este hook
 * reescribe esa URL según `Accept-Language`; `error` (el código OAuth) no se
 * toca, los clientes siguen pudiendo decidir por él.
 */

type Translator = (description: string) => string | undefined;

// Textos exactos del oauth-provider (dist/authorize-*.mjs)
const exact: Record<string, string> = {
  "User denied access": "Rechazaste el acceso a la aplicación.",
  "authentication required": "Debes iniciar sesión para continuar.",
  "End-User consent is required": "Se requiere tu consentimiento para continuar.",
  "End-User interaction is required": "Se requiere tu interacción para continuar.",
  "End-User account selection is required": "Debes seleccionar una cuenta para continuar.",
  "essential acr requirement cannot be met":
    "No se puede cumplir el nivel de autenticación requerido.",
  "client is disabled": "La aplicación está deshabilitada.",
  "client_id is required": "Falta el identificador de la aplicación (client_id).",
  "invalid redirect uri": "La URL de retorno de la aplicación no es válida.",
  "unsupported response type": "Tipo de respuesta no soportado.",
  "client is not authorized to use the authorization_code grant":
    "La aplicación no está autorizada para este tipo de acceso.",
  "code_challenge and code_challenge_method must both be provided":
    "La solicitud PKCE está incompleta.",
  "invalid code_challenge method, only S256 is supported":
    "Método PKCE no soportado (solo S256).",
  "openid scope must be requested when using the claims parameter":
    "La solicitud de claims requiere el scope openid.",
  "claims must be a valid Claims request object":
    "La solicitud de claims no es válida.",
};

const patterns: [RegExp, (match: RegExpMatchArray) => string][] = [
  [
    /^The following scopes are invalid: (.+)$/,
    (m) => `Los siguientes permisos (scopes) no son válidos: ${m[1]}.`,
  ],
];

// Respaldo por código OAuth (RFC 6749 §4.1.2.1, OIDC Core §3.1.2.6, RFC 8707)
const byCode: Record<string, string> = {
  access_denied: "Se denegó el acceso.",
  invalid_request: "La solicitud de autorización no es válida.",
  invalid_scope: "Los permisos solicitados no son válidos.",
  invalid_target: "El recurso solicitado no es válido.",
  invalid_client: "La aplicación no es válida.",
  unauthorized_client: "La aplicación no está autorizada.",
  unsupported_response_type: "Tipo de respuesta no soportado.",
  login_required: "Debes iniciar sesión para continuar.",
  consent_required: "Se requiere tu consentimiento para continuar.",
  interaction_required: "Se requiere tu interacción para continuar.",
  account_selection_required: "Debes seleccionar una cuenta para continuar.",
  server_error: "Ocurrió un error en el servidor de autenticación.",
  temporarily_unavailable: "El servicio de autenticación no está disponible temporalmente.",
};

const translations: Record<string, (code: string) => Translator> = {
  es: (code) => (description) => {
    if (exact[description]) return exact[description];
    for (const [regex, render] of patterns) {
      const match = description.match(regex);
      if (match) return render(match);
    }
    return byCode[code];
  },
};

/** Mismo criterio que @better-auth/i18n: idioma base, ordenado por q. */
function detectLocale(header: string | null | undefined) {
  if (!header) return undefined;
  return header
    .split(",")
    .map((part) => {
      const [tag = "", q = "q=1"] = part.trim().split(";");
      return { locale: tag.trim().split("-")[0], q: Number.parseFloat(q.replace("q=", "")) };
    })
    .sort((a, b) => b.q - a.q)
    .map(({ locale }) => locale)
    .find((locale) => locale === "en" || locale in translations);
}

/** Devuelve la URL con `error_description` traducido, o `undefined` si no aplica. */
function translateErrorURL(url: string, locale: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  // response_mode=fragment lleva los parámetros en el hash
  const inFragment = parsed.hash.length > 1 && !parsed.searchParams.has("error");
  const params = inFragment ? new URLSearchParams(parsed.hash.slice(1)) : parsed.searchParams;
  const code = params.get("error");
  const description = params.get("error_description");
  if (!code || !description) return undefined;

  const translated = translations[locale]?.(code)(description);
  if (!translated || translated === description) return undefined;
  params.set("error_description", translated);
  if (inFragment) parsed.hash = params.toString();
  return parsed.toString();
}

export const BetterAuthOAuthErrorI18nServerConfig = {
  id: "oauth-error-i18n",
  hooks: {
    after: [
      {
        matcher: (ctx) => ctx.path?.startsWith("/oauth2/") ?? false,
        handler: createAuthMiddleware(async (ctx) => {
          const locale = detectLocale(ctx.headers?.get("accept-language"));
          if (!locale || locale === "en") return;
          const returned = ctx.context.returned;

          // Navegación: redirect 302; la respuesta final usa responseHeaders
          if (isAPIError(returned)) {
            const location = ctx.context.responseHeaders?.get("location");
            const translated = location && translateErrorURL(location, locale);
            if (translated) ctx.context.responseHeaders?.set("location", translated);
            return;
          }

          // fetch / Accept: application/json → { redirect: true, url }
          if (
            returned &&
            typeof returned === "object" &&
            "redirect" in returned &&
            "url" in returned &&
            typeof returned.url === "string"
          ) {
            const translated = translateErrorURL(returned.url, locale);
            if (translated) returned.url = translated;
          }
        }),
      },
    ],
  },
} satisfies BetterAuthPlugin;
