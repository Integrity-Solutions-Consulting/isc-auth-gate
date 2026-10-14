import { CodeBlock } from "@/components/reui/code-block";
import { getPublicAuthConfig } from "@/lib/runtime-config";

export default async function FlowsPage() {
  const { baseUrl } = await getPublicAuthConfig();
  const issuer = `${baseUrl}/api/auth`;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Authorization Code + PKCE
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-pretty">
          El flujo estándar para apps web y móviles. El usuario es redirigido a
          la pantalla de login, autoriza los scopes solicitados y tu app recibe
          un código canjeable por tokens.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">1. Genera el code verifier</h2>
        <p className="text-muted-foreground text-sm">
          PKCE protege el intercambio del código incluso si el canal de
          redirección no es confiable. Genera un verifier aleatorio y deriva el
          challenge con SHA-256 (S256).
        </p>
        <CodeBlock
          language="bash"
          code={`VERIFIER=$(openssl rand -base64 48 | tr -d '=+/')
CHALLENGE=$(printf '%s' "$VERIFIER" | openssl dgst -sha256 -binary | base64 | tr '+/' '-_' | tr -d '=')`}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          2. Redirige al usuario al authorize endpoint
        </h2>
        <CodeBlock
          language="bash"
          code={`CLIENT_ID="tu_client_id"
REDIRECT_URI="https://miapp.com/callback"
SCOPE="openid%20profile%20email%20offline_access"
RESOURCE="https://api.miapp.com"   # opcional: identifier de tu API (RFC 8707)

open "${issuer}/oauth2/authorize?client_id=${"$"}{CLIENT_ID}&redirect_uri=${"$"}{REDIRECT_URI}&response_type=code&scope=${"$"}{SCOPE}&state=un-estado-aleatorio&code_challenge=${"$"}{CHALLENGE}&code_challenge_method=S256&resource=${"$"}{RESOURCE}"`}
        />
        <p className="text-muted-foreground text-sm">
          El usuario inicia sesión (si no está logueado), revisa la pantalla de
          consentimiento y autoriza. El servidor redirige a tu{" "}
          <code className="bg-muted rounded px-1 font-mono text-xs">
            redirect_uri
          </code>{" "}
          con el <code className="bg-muted rounded px-1 font-mono text-xs">code</code>{" "}
          y el <code className="bg-muted rounded px-1 font-mono text-xs">state</code>{" "}
          que enviaste.
        </p>
        <p className="text-muted-foreground text-sm">
          Envía <code className="bg-muted rounded px-1 font-mono text-xs">resource</code>{" "}
          si vas a llamar a una API propia: obtienes un access token JWT con{" "}
          <code className="bg-muted rounded px-1 font-mono text-xs">aud</code> = tu
          API. El cliente debe estar vinculado a ese resource (si no:{" "}
          <code className="bg-muted rounded px-1 font-mono text-xs">invalid_target</code>
          ) y el token solo llevará los scopes permitidos por el resource (ver{" "}
          <a href="/developers/scopes" className="text-primary underline underline-offset-2">
            Scopes
          </a>
          ).
        </p>
        <CodeBlock
          language="text"
          code={`https://miapp.com/callback?code=abc123...&state=un-estado-aleatorio`}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">3. Canjea el código por tokens</h2>
        <p className="text-muted-foreground text-sm">
          Llama al token endpoint desde tu backend (nunca expongas el secret en
          el cliente). Con <code className="bg-muted rounded px-1 font-mono text-xs">-u</code>{" "}
          se usa <code className="bg-muted rounded px-1 font-mono text-xs">client_secret_basic</code>;
          si registraste <code className="bg-muted rounded px-1 font-mono text-xs">client_secret_post</code>,
          envía <code className="bg-muted rounded px-1 font-mono text-xs">client_id</code> y{" "}
          <code className="bg-muted rounded px-1 font-mono text-xs">client_secret</code> en el
          cuerpo (si no coincide: <code className="bg-muted rounded px-1 font-mono text-xs">invalid_client</code>).
          Clientes públicos usan{" "}
          <code className="bg-muted rounded px-1 font-mono text-xs">
            client_id
          </code>{" "}
          sin secret.
        </p>
        <CodeBlock
          language="bash"
          code={`CLIENT_SECRET="tu_client_secret"  # solo clientes confidenciales

curl -s -X POST "${issuer}/oauth2/token" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -u "${"$"}{CLIENT_ID}:${"$"}{CLIENT_SECRET}" \\
  -d "grant_type=authorization_code" \\
  -d "code=abc123..." \\
  -d "redirect_uri=${"$"}{REDIRECT_URI}" \\
  -d "code_verifier=${"$"}{VERIFIER}" \\
  -d "resource=${"$"}{RESOURCE}" | jq .   # el mismo resource del authorize`}
        />
        <p className="text-muted-foreground text-sm">
          La respuesta incluye{" "}
          <code className="bg-muted rounded px-1 font-mono text-xs">access_token</code>{" "}
          (JWT si enviaste resource; opaco si no), <code className="bg-muted rounded px-1 font-mono text-xs">refresh_token</code>{" "}
          (si solicitaste{" "}
          <code className="bg-muted rounded px-1 font-mono text-xs">
            offline_access
          </code>
          ), <code className="bg-muted rounded px-1 font-mono text-xs">id_token</code>{" "}
          (si solicitaste{" "}
          <code className="bg-muted rounded px-1 font-mono text-xs">openid</code>)
          y el <code className="bg-muted rounded px-1 font-mono text-xs">expires_in</code>.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">4. Llama a una API con el token</h2>
        <p className="text-muted-foreground text-sm">
          El endpoint de userinfo (OIDC) valida el token y devuelve los claims
          del usuario autorizado:
        </p>
        <CodeBlock
          language="bash"
          code={`curl -s ${issuer}/oauth2/userinfo \\
  -H "Authorization: Bearer ${"$"}{ACCESS_TOKEN}" | jq .`}
        />
        <p className="text-muted-foreground text-sm">
          Con un token válido responde{" "}
          <code className="bg-muted rounded px-1 font-mono text-xs">
            {"{ \"sub\": \"...\", \"email\": \"...\", ... }"}
          </code>{" "}
          y sin token o token inválido responde{" "}
          <code className="bg-muted rounded px-1 font-mono text-xs">401</code>.
          Para proteger tus propias APIs, ver{" "}
          <a
            href="/developers/resource-server"
            className="text-primary underline underline-offset-2"
          >
            Resource Server
          </a>
          .
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">5. Renueva con refresh token</h2>
        <CodeBlock
          language="bash"
          code={`curl -s -X POST "${issuer}/oauth2/token" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -u "${"$"}{CLIENT_ID}:${"$"}{CLIENT_SECRET}" \\
  -d "grant_type=refresh_token" \\
  -d "refresh_token=${"$"}{REFRESH_TOKEN}" \\
  -d "resource=${"$"}{RESOURCE}" | jq .   # repítelo para conservar el aud`}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">6. Revoca un token</h2>
        <p className="text-muted-foreground text-sm">
          Revoca el refresh token (o un access token opaco). Los access tokens
          JWT no se pueden revocar: expiran por sí solos.
        </p>
        <CodeBlock
          language="bash"
          code={`curl -s -X POST "${issuer}/oauth2/revoke" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -u "${"$"}{CLIENT_ID}:${"$"}{CLIENT_SECRET}" \\
  -d "token=${"$"}{REFRESH_TOKEN}"`}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">7. Cierra la sesión en el gate</h2>
        <p className="text-muted-foreground text-sm">
          Logout iniciado por la app (OIDC RP-initiated logout). La URL de
          retorno debe estar registrada como post-logout redirect URI del
          cliente:
        </p>
        <CodeBlock
          language="bash"
          code={`open "${issuer}/oauth2/end-session?id_token_hint=${"$"}{ID_TOKEN}&post_logout_redirect_uri=https://miapp.com/&client_id=${"$"}{CLIENT_ID}"`}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Notas importantes</h2>
        <ul className="text-muted-foreground list-inside list-disc text-sm">
          <li>
            El <code className="bg-muted rounded px-1 font-mono text-xs">state</code>{" "}
            previene CSRF: valídalo contra el valor que generaste.
          </li>
          <li>
            Los códigos expiran a los 10 minutos y se usan una sola vez.
          </li>
          <li>
            El refresh token rotativo se invalida al usarse (puedes reutilizar
            el anterior si el nuevo no llegó, dentro de la ventana de
            tolerancia).
          </li>
          <li>
            El id_token solo contiene identidad (sub, iss, aud); los claims de
            profile y email se leen desde el endpoint de userinfo.
          </li>
          <li>
            El id_token se valida con las claves del jwks_uri y su{" "}
            <code className="bg-muted rounded px-1 font-mono text-xs">iss</code>{" "}
            debe coincidir con {issuer}.
          </li>
        </ul>
      </section>
    </div>
  );
}
