// Utilidades del flujo OAuth en las páginas del gate (login, 2FA, selector de
// organización, consentimiento). El /oauth2/authorize manda al login con una
// query firmada (`sig`, caduca en `exp`); el cliente de Better Auth la reenvía
// como `oauth_query` en cada POST y, al crear la sesión, el servidor retoma el
// authorize y devuelve a la app. Si una página pierde esa query, el usuario
// termina en /dashboard del gate en vez de volver a la app.

/** Ruta que devuelve a la app con un error OAuth cuando la solicitud expiró. */
export const OAUTH_EXPIRED_PATH = "/auth/oauth-expired";

/** ¿La URL actual es parte de un flujo OAuth (trae la query firmada)? */
export function isOAuthFlow(search: string | URLSearchParams) {
  return new URLSearchParams(search).has("sig");
}

/** ¿Ya pasó el `exp` de la query firmada? (solo UX: el servidor lo re-verifica) */
export function isOAuthQueryExpired(search: string | URLSearchParams) {
  const exp = Number(new URLSearchParams(search).get("exp"));
  return Number.isFinite(exp) && exp > 0 && exp * 1000 < Date.now();
}

/** Error del plugin oauth-provider: query alterada o caducada. */
export function isInvalidSignature(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { error?: unknown }).error === "invalid_signature"
  );
}

/** Enlace a OAUTH_EXPIRED_PATH con lo necesario para volver a la app. */
export function oauthExpiredHref(search: string | URLSearchParams) {
  const params = new URLSearchParams(search);
  const back = new URLSearchParams();
  for (const key of ["client_id", "redirect_uri", "state"]) {
    const value = params.get(key);
    if (value) back.set(key, value);
  }
  return `${OAUTH_EXPIRED_PATH}?${back}`;
}
