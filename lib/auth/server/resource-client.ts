import { createAuthClient } from "better-auth/client";
import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";
import { betterAuthServer } from "@/lib/auth/server";

/**
 * Server-only OAuth resource client (lib).
 *
 * Verifica access tokens emitidos por el OAuth provider (verificación local
 * con JWKS por defecto; introspect remoto vía `remoteVerify`).
 *
 * @see https://better-auth.com/docs/plugins/oauth-provider#resource-client
 *
 * @example Proteger un endpoint de API:
 * ```ts
 * import { serverClient } from "@/lib/auth/server/resource-client";
 * import { env } from "@/env/server";
 *
 * const baseUrl = env.BETTER_AUTH_URL.replace(/\/+$/, "");
 *
 * export async function GET(request: Request) {
 *   const authHeader = request.headers.get("authorization");
 *   const accessToken = authHeader?.startsWith("Bearer ")
 *     ? authHeader.replace("Bearer ", "")
 *     : authHeader;
 *
 *   try {
 *     const payload = await serverClient.verifyBearerToken(accessToken, {
 *       verifyOptions: {
 *         issuer: `${baseUrl}/api/auth`,
 *         audience: "https://api.tu-app.com", // identifier del resource (RFC 8707)
 *       },
 *       requiredScopes: ["profile"],
 *     });
 *     return Response.json({ sub: payload.sub, scopes: payload.scope });
 *   } catch {
 *     return Response.json({ error: "unauthorized" }, { status: 401 });
 *   }
 * }
 * ```
 *
 * @example Verificación remota por introspect:
 * ```ts
 * await serverClient.verifyBearerToken(accessToken, {
 *   remoteVerify: {
 *     url: `${baseUrl}/api/auth/oauth2/introspect`,
 *     auth: { clientId, clientSecret },
 *   },
 * });
 * ```
 */
export const serverClient = createAuthClient({
  plugins: [oauthProviderResourceClient(betterAuthServer)],
});
