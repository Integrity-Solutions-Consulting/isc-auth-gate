import { CodeBlock } from "@/components/reui/code-block";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { TriangleAlertIcon } from "lucide-react";
import { getPublicAuthConfig } from "@/lib/runtime-config";

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="bg-muted rounded px-1 font-mono text-xs">{children}</code>
);

export default async function M2MPage() {
  const { baseUrl } = await getPublicAuthConfig();
  const issuer = `${baseUrl}/api/auth`;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Machine to Machine
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-pretty">
          El grant{" "}
          <code className="bg-muted rounded px-1 font-mono text-xs">
            client_credentials
          </code>{" "}
          permite que servicios y backends obtengan tokens sin un usuario de
          por medio.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">1. Requisitos del cliente</h2>
        <ul className="text-muted-foreground list-inside list-disc text-sm">
          <li>
            Cliente <strong>confidencial</strong> (
            <Code>client_secret_basic</Code> o <Code>client_secret_post</Code>
            ) con el grant type <Code>client_credentials</Code>.
          </li>
          <li>
            Una lista de <strong>client_credentials_scopes</strong>: el techo de
            scopes para tokens de máquina. Los scopes de usuario (
            <Code>openid</Code>, <Code>profile</Code>, <Code>email</Code>,{" "}
            <Code>offline_access</Code>) no están permitidos; usa scopes de API
            como <Code>todo:read</Code>.
          </li>
          <li>
            Si el token es para una API propia, el cliente debe estar vinculado
            a ese resource (si no: <Code>invalid_target</Code>).
          </li>
        </ul>
        <Alert>
          <TriangleAlertIcon data-icon="inline-start" />
          <AlertTitle>Limitación actual del panel</AlertTitle>
          <AlertDescription>
            El formulario de clientes todavía no permite definir los
            client_credentials_scopes (el plugin solo los acepta desde el
            endpoint de administración del servidor). Pide a un administrador
            del gate que los configure.
          </AlertDescription>
        </Alert>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">2. Obtén un token</h2>
        <CodeBlock
          language="bash"
          code={`CLIENT_ID="tu_client_id"
CLIENT_SECRET="tu_client_secret"

curl -s -X POST "${issuer}/oauth2/token" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -u "${"$"}{CLIENT_ID}:${"$"}{CLIENT_SECRET}" \\
  -d "grant_type=client_credentials" \\
  -d "scope=todo:read" \\
  -d "resource=https://api.miapp.com" | jq .`}
        />
        <p className="text-muted-foreground text-sm">
          Con <Code>resource</Code> recibes un JWT con <Code>aud</Code> = tu
          API. No hay usuario detrás: no hay refresh token ni id_token, y el
          endpoint de userinfo no aplica.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">3. Valida el token en tu API</h2>
        <p className="text-muted-foreground text-sm">
          Igual que un token de usuario: firma (JWKS), <Code>iss</Code>,{" "}
          <Code>aud</Code> y scopes. Ver{" "}
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
        <AlertTitle className="capitalize">Buenas prácticas</AlertTitle>
        <AlertDescription>
          Guarda el secret en un secret manager, rota el client secret
          periódicamente y limita los scopes al mínimo necesario para el
          servicio.
        </AlertDescription>
      </Alert>
    </div>
  );
}
