import { CodeBlock } from "@/components/reui/code-block";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlertIcon } from "lucide-react";
import { getPublicAuthConfig } from "@/lib/runtime-config";

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="bg-muted rounded px-1 font-mono text-xs">{children}</code>
);

// Receta probada con la app de referencia isc-tmr (Next.js + Elysia,
// better-auth 1.7.1, genericOAuth).
export default async function BetterAuthClientPage() {
  const { baseUrl } = await getPublicAuthConfig();
  const issuer = `${baseUrl}/api/auth`;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cliente Better Auth</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-pretty">
          Si tu app usa Better Auth, el plugin <Code>genericOAuth</Code> se
          encarga del flujo completo (PKCE, canje del code, refresh y logout).
          Esta receta es la que usa la app de referencia <strong>isc-tmr</strong>
          , que inicia sesión con el gate y protege su API con los tokens.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">1. Prepara el gate</h2>
        <ol className="text-muted-foreground list-inside list-decimal text-sm space-y-1">
          <li>
            Si usas scopes propios, que estén habilitados en el gate (
            <a href="/developers/scopes" className="text-primary underline underline-offset-2">
              Scopes
            </a>
            ).
          </li>
          <li>
            Registra tu API como <strong>resource</strong> con allowedScopes que
            incluyan <Code>openid profile email offline_access</Code> además de
            los tuyos.
          </li>
          <li>
            Crea un cliente confidencial con redirect URI{" "}
            <Code>{"https://tu-app/api/auth/callback/<providerId>"}</Code>,
            método <Code>client_secret_basic</Code>, grants{" "}
            <Code>authorization_code</Code> y <Code>refresh_token</Code>, los
            scopes que pedirá, y vincúlale el resource.
          </li>
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">2. Variables de entorno</h2>
        <CodeBlock
          language="bash"
          code={`BETTER_AUTH_SECRET=...                 # propio de tu app
BETTER_AUTH_URL=https://tu-app          # de aquí sale la redirect URI
OIDC_ISSUER=${issuer}
OIDC_CLIENT_ID=...
OIDC_CLIENT_SECRET=...
OIDC_RESOURCE=https://api.tu-app.com    # = identifier del resource`}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">3. Configura genericOAuth</h2>
        <CodeBlock
          language="ts"
          code={`import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins/generic-oauth";

const issuer = process.env.OIDC_ISSUER!;

export const auth = betterAuth({
  advanced: {
    // Mismo host que el gate en desarrollo: las cookies no se aíslan por
    // puerto. Sin prefijo propio pisarías las cookies better-auth.* del gate.
    cookiePrefix: "tu-app",
  },
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "isc-gate",
          discoveryUrl: \`\${issuer}/.well-known/openid-configuration\`,
          clientId: process.env.OIDC_CLIENT_ID!,
          clientSecret: process.env.OIDC_CLIENT_SECRET!,
          // Debe coincidir con el método del cliente en el gate. El default
          // de Better Auth es "post": con un cliente basic → invalid_client.
          authentication: "basic",
          scopes: ["openid", "profile", "email", "offline_access", "todo:read"],
          // RFC 8707: access token JWT con aud = tu API. Repítelo en el
          // refresh para conservar la audiencia.
          authorizationUrlParams: { resource: process.env.OIDC_RESOURCE! },
          refreshTokenParams: { resource: process.env.OIDC_RESOURCE! },
          postLogoutRedirectURI: "/",
        },
      ],
    }),
  ],
});`}
        />
        <p className="text-muted-foreground text-sm">
          Con <Code>discoveryUrl</Code> basta. Si además defines{" "}
          <Code>authorizationUrl</Code>, <Code>tokenUrl</Code>,{" "}
          <Code>userInfoUrl</Code> o <Code>endSessionEndpoint</Code> (como
          isc-tmr), en better-auth 1.7 esos valores tienen prioridad sobre el
          discovery. La app puede funcionar sin base de datos: la sesión y los
          tokens del gate viajan en cookies cifradas.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">4. Inicia y cierra sesión</h2>
        <CodeBlock
          language="ts"
          code={`import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

// Login: redirige al gate y vuelve a /api/auth/callback/isc-gate
await authClient.signIn.social({ provider: "isc-gate", callbackURL: "/" });

// Logout en tu app (y en el gate vía end-session)
await authClient.signOut();`}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          5. Usa el access token en tu servidor
        </h2>
        <p className="text-muted-foreground text-sm">
          <Code>getAccessToken</Code> devuelve el token del gate y lo renueva
          con el refresh token cuando expira. Si lo renovó, reenvía las cookies
          nuevas en tu respuesta:
        </p>
        <CodeBlock
          language="ts"
          code={`const { response, headers } = await auth.api.getAccessToken({
  // better-auth 1.7: { useAccountCookie: true } (cuenta OAuth de la cookie
  // firmada; funciona sin DB) o { accountId } si guardas cuentas en DB.
  body: { useAccountCookie: true },
  headers: request.headers,
  returnHeaders: true,
});
// response.accessToken → verifícalo como en "Resource Server"
// headers.getSetCookie() → cookies rotadas tras un refresh`}
        />
        <p className="text-muted-foreground text-sm">
          Para validar el token en tu API (firma, <Code>aud</Code> y scopes),
          sigue{" "}
          <a
            href="/developers/resource-server"
            className="text-primary underline underline-offset-2"
          >
            Resource Server
          </a>
          .
        </p>
      </section>

      <Alert>
        <TriangleAlertIcon data-icon="inline-start" />
        <AlertTitle>HTTPS con certificado propio en desarrollo</AlertTitle>
        <AlertDescription>
          El servidor de tu app llama al gate (discovery, token, userinfo,
          JWKS). Si el gate usa un certificado de una CA local, arranca tu app
          con <Code>NODE_EXTRA_CA_CERTS=/ruta/rootCA.pem</Code> o esas llamadas
          fallarán por TLS.
        </AlertDescription>
      </Alert>
    </div>
  );
}
