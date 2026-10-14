import { CodeBlock } from "@/components/reui/code-block";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  TriangleAlertIcon,
} from "lucide-react";
import { getPublicAuthConfig } from "@/lib/runtime-config";

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="bg-muted rounded px-1 font-mono text-xs">{children}</code>
);

export default async function QuickstartPage() {
  const { baseUrl } = await getPublicAuthConfig();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quickstart</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-pretty">
          Registra tu aplicación, obtén tus credenciales y completa tu primera
          autorización.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">1. Registra tu aplicación</h2>
        <p className="text-muted-foreground text-sm">
          La registra un administrador del gate (o un owner/admin de tu
          organización desde <em>Organizaciones → Apps</em>) en{" "}
          <strong>Panel → Administración → OAuth Apps → Nuevo cliente</strong>.
          El formulario tiene cuatro pasos:
        </p>
        <ol className="text-muted-foreground list-inside list-decimal text-sm space-y-1">
          <li>
            <strong>Datos de la app</strong>: nombre, URL pública y logo.
          </li>
          <li>
            <strong>Redirect URIs</strong> de callback (HTTPS en producción) y,
            si haces logout en el gate, las <em>post-logout redirect URIs</em>.
            Si tu app usa Better Auth, la redirect URI es{" "}
            <Code>{"https://tu-app/api/auth/callback/<providerId>"}</Code>.
          </li>
          <li>
            <strong>Configuración OAuth</strong>: scopes (separados por
            espacio), método de autenticación (<Code>client_secret_basic</Code>{" "}
            por defecto, <Code>client_secret_post</Code>, o <Code>none</Code>{" "}
            para clientes públicos con PKCE), grant types (
            <Code>authorization_code</Code> y <Code>refresh_token</Code> para
            apps con usuario) y los <strong>resources</strong> (APIs) para los
            que pedirá tokens.
          </li>
          <li>
            <strong>Resumen</strong>: recibes el <strong>client_id</strong> y,
            si es confidencial, el <strong>client_secret</strong>. El secret se
            muestra una única vez: guárdalo de forma segura.
          </li>
        </ol>
        <p className="text-muted-foreground text-sm">
          Si tu app llama a una API propia, regístrala como resource y
          vincúlala al cliente (detalle del cliente → tarjeta
          &quot;Resources&quot;). Revisa{" "}
          <a
            href="/developers/resource-server"
            className="text-primary underline underline-offset-2"
          >
            Resource Server
          </a>{" "}
          y la regla de los allowedScopes en{" "}
          <a
            href="/developers/scopes"
            className="text-primary underline underline-offset-2"
          >
            Scopes
          </a>
          .
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">2. Verifica tu conexión</h2>
        <p className="text-muted-foreground text-sm">
          El endpoint de descubrimiento responde la configuración completa del
          servidor:
        </p>
        <CodeBlock
          language="bash"
          code={`curl -s ${baseUrl}/.well-known/oauth-authorization-server/api/auth | jq .`}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">3. Flujo recomendado</h2>
        <p className="text-muted-foreground text-sm">
          Para apps web y móviles usa{" "}
          <strong>Authorization Code + PKCE (S256)</strong>. La guía completa
          con pasos y ejemplos está en{" "}
          <a
            href="/developers/flows"
            className="text-primary underline underline-offset-2"
          >
            Authorization Code + PKCE
          </a>
          . Si tu app usa Better Auth, sigue{" "}
          <a
            href="/developers/better-auth"
            className="text-primary underline underline-offset-2"
          >
            Cliente Better Auth
          </a>
          .
        </p>
      </section>

      <Alert>
        <TriangleAlertIcon data-icon="inline-start" />
        <AlertTitle className="capitalize">Requisitos de seguridad</AlertTitle>
        <AlertDescription>
          OAuth 2.1 exige PKCE para clientes públicos y transporte HTTPS en
          producción. Los access tokens pedidos para un resource son JWT
          firmados con EdDSA (Ed25519); sin resource son opacos.
        </AlertDescription>
      </Alert>
    </div>
  );
}
