import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { drizzlePostgreClient as db } from "@/database/clients/postgre";
import { oauthClients } from "@/database/schema";
import { env } from "@/env/server";

const DESCRIPTION = {
  es: "La solicitud de inicio de sesión expiró. Vuelve a intentarlo.",
  en: "The sign-in request expired. Please try again.",
};

/**
 * "Volver a la aplicación" cuando la query firmada del authorize ya no sirve
 * (invalid_signature). Responde a la app como un error OAuth estándar
 * (RFC 6749 §4.1.2.1) con su `state`, y la app muestra el error y reinicia el
 * flujo. Los parámetros vienen de una query sin firma válida: la redirect_uri
 * solo se usa si es una de las registradas del cliente (sin open redirect).
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const clientId = params.get("client_id");
  const redirectUri = params.get("redirect_uri");

  if (clientId && redirectUri) {
    const [client] = await db
      .select({ redirectUris: oauthClients.redirectUris, disabled: oauthClients.disabled })
      .from(oauthClients)
      .where(eq(oauthClients.clientId, clientId))
      .limit(1);

    if (client && !client.disabled && client.redirectUris.includes(redirectUri)) {
      const spanish = /^\s*es\b/i.test(request.headers.get("accept-language") ?? "");
      const target = new URL(redirectUri);
      target.searchParams.set("error", "login_required");
      target.searchParams.set("error_description", spanish ? DESCRIPTION.es : DESCRIPTION.en);
      const state = params.get("state");
      if (state) target.searchParams.set("state", state);
      // RFC 9207: el cliente valida que el error venga de su issuer
      target.searchParams.set(
        "iss",
        `${env.BETTER_AUTH_URL.replace(/\/+$/, "")}${env.BETTER_AUTH_SERVER_PATH}`,
      );
      return NextResponse.redirect(target);
    }
  }

  // Sin cliente o redirect_uri válidos: al login del gate con el aviso
  const signIn = new URL("/auth/sign-in", request.url);
  signIn.searchParams.set("code", "oauth_expired");
  signIn.searchParams.set("status", "400");
  signIn.searchParams.set("statusText", "Solicitud expirada");
  signIn.searchParams.set(
    "message",
    "La solicitud de inicio de sesión expiró. Vuelve a la aplicación e inicia sesión de nuevo.",
  );
  return NextResponse.redirect(signIn);
}
