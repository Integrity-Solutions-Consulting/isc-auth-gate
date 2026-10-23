import { CodeBlock } from "@/components/reui/code-block";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlertIcon } from "lucide-react";
import { getPublicAuthConfig } from "@/lib/runtime-config";

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="bg-muted rounded px-1 font-mono text-xs">{children}</code>
);

export default async function ResourceServerPage() {
  const { baseUrl } = await getPublicAuthConfig();
  const issuer = `${baseUrl}/api/auth`;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resource Server</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-pretty">
          Protege tu API validando los access tokens que emite ISC Auth. Si el
          cliente pide el token indicando tu API con el parámetro{" "}
          <Code>resource</Code> (RFC 8707), recibe un JWT firmado con{" "}
          <strong>EdDSA (Ed25519)</strong> que tu API verifica localmente con
          las claves del JWKS, sin llamadas de red por request.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">1. Registra tu API como resource</h2>
        <p className="text-muted-foreground text-sm">
          Un administrador registra la API en el panel (OAuth Apps → Resources)
          con un <strong>identifier</strong>: una URI que la nombra, por ejemplo{" "}
          <Code>https://api.tu-app.com</Code>. Es solo un nombre, no tiene que
          responder: debe coincidir exactamente con el <Code>resource</Code> que
          envía el cliente y con el <Code>audience</Code> que valida tu API.
        </p>
        <ul className="text-muted-foreground list-inside list-disc text-sm">
          <li>
            Cada cliente que vaya a pedir tokens para la API debe estar{" "}
            <strong>vinculado</strong> al resource (detalle del cliente →
            tarjeta &quot;Resources&quot;). Si no, el gate responde{" "}
            <Code>invalid_target</Code>.
          </li>
          <li>
            Si defines <strong>allowedScopes</strong>, el token solo llevará la
            intersección entre lo pedido y esa lista. Incluye{" "}
            <Code>openid profile email offline_access</Code> si una app inicia
            sesión con estos tokens (ver{" "}
            <a
              href="/developers/scopes"
              className="text-primary underline underline-offset-2"
            >
              Scopes
            </a>
            ).
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">2. Qué contiene el access token</h2>
        <CodeBlock
          language="json"
          code={`{
  "iss": "${issuer}",
  "aud": ["https://api.tu-app.com", "${issuer}/oauth2/userinfo"],
  "sub": "<id del usuario>",
  "azp": "<client_id>",
  "scope": "openid profile email todo:read",
  "iat": 1791141504,
  "exp": 1791145104
}`}
        />
        <ul className="text-muted-foreground list-inside list-disc text-sm">
          <li>
            <strong>aud</strong>: el identifier de tu resource (más el endpoint
            de userinfo). Valida siempre que incluya tu identifier.
          </li>
          <li>
            <strong>scope</strong>: scopes concedidos, separados por espacio.
          </li>
          <li>
            <strong>exp</strong>: 1 hora por defecto, o el{" "}
            <Code>accessTokenTtl</Code> del resource si está definido.
          </li>
          <li>
            Sin el parámetro <Code>resource</Code> el token es{" "}
            <strong>opaco</strong> y solo se puede validar con introspect
            (sección 5).
          </li>
        </ul>
        <CodeBlock language="bash" code={`# Claves públicas (JWKS)
curl -s ${issuer}/jwks | jq .`} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          3. Verificación local con jose (cualquier stack JS/TS)
        </h2>
        <CodeBlock
          language="ts"
          code={`import { createRemoteJWKSet, jwtVerify } from "jose";

const ISSUER = "${issuer}";
const RESOURCE = "https://api.tu-app.com"; // identifier del resource
const jwks = createRemoteJWKSet(new URL(\`\${ISSUER}/jwks\`)); // se cachea

export async function verify(request: Request, requiredScopes: string[]) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) throw new Response("missing token", { status: 401 });

  const { payload } = await jwtVerify(token, jwks, {
    issuer: ISSUER,
    audience: RESOURCE,
    algorithms: ["EdDSA"],
  }).catch(() => {
    throw new Response("invalid token", { status: 401 });
  });

  const scopes = String(payload.scope ?? "").split(" ");
  if (!requiredScopes.every((s) => scopes.includes(s))) {
    throw new Response("insufficient_scope", { status: 403 });
  }
  return payload; // payload.sub = usuario
}`}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          4. Verificación con el resource client de Better Auth
        </h2>
        <p className="text-muted-foreground text-sm">
          Si tu API usa Better Auth (o puede instalar{" "}
          <Code>@better-auth/oauth-provider</Code>), el resource client hace lo
          mismo y comprueba los scopes por ti.{" "}
          <Code>verifyAccessTokenRequest</Code> además valida tokens DPoP:
        </p>
        <CodeBlock
          language="ts"
          code={`import { createAuthClient } from "better-auth/client";
import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";

const ISSUER = "${issuer}";
const RESOURCE = "https://api.tu-app.com";

const resourceClient = createAuthClient({
  plugins: [oauthProviderResourceClient()],
});

export async function GET(request: Request) {
  try {
    const payload = await resourceClient.verifyAccessTokenRequest(request, {
      jwksUrl: \`\${ISSUER}/jwks\`,
      verifyOptions: { issuer: ISSUER, audience: RESOURCE },
      requiredScopes: ["todo:read"], // 403 si falta alguno
    });
    return Response.json({ sub: payload.sub, scope: payload.scope });
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
}`}
        />
        <p className="text-muted-foreground text-sm">
          Para un token que ya tienes como string usa{" "}
          <Code>verifyBearerToken(token, opciones)</Code> con las mismas
          opciones. La opción para exigir scopes se llama{" "}
          <Code>requiredScopes</Code>.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          5. Verificación remota (introspect)
        </h2>
        <p className="text-muted-foreground text-sm">
          Para tokens opacos, o si necesitas saber si el token fue revocado
          antes de expirar. Requiere credenciales de un cliente confidencial:
        </p>
        <CodeBlock
          language="bash"
          code={`curl -s -X POST "${issuer}/oauth2/introspect" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -u "${"$"}{CLIENT_ID}:${"$"}{CLIENT_SECRET}" \\
  -d "token=${"$"}{ACCESS_TOKEN}" | jq .`}
        />
      </section>

      <Alert>
        <TriangleAlertIcon data-icon="inline-start" />
        <AlertTitle>Roles y permisos</AlertTitle>
        <AlertDescription>
          Por ahora los tokens identifican al usuario (<Code>sub</Code>) y sus
          scopes, pero no incluyen sus roles ni permisos del gate. Mientras
          tanto, autoriza por scopes.
        </AlertDescription>
      </Alert>
    </div>
  );
}
