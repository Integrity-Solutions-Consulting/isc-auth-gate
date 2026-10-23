import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlertIcon } from "lucide-react";
import { env } from "@/env/server";
import { getPublicAuthConfig } from "@/lib/runtime-config";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const scopes = [
  {
    name: "openid",
    description: "Requerido para OIDC. Devuelve un id_token con el sub del usuario.",
    requires: "Obligatorio si usas OIDC",
  },
  {
    name: "profile",
    description: "Datos básicos del perfil: name, picture, given_name, family_name.",
    requires: "—",
  },
  {
    name: "email",
    description: "Dirección de correo y estado de verificación.",
    requires: "—",
  },
  {
    name: "offline_access",
    description:
      "Permite emitir refresh_token para acceder en segundo plano cuando el usuario no está conectado.",
    requires: "Solicítalo solo si lo necesitas",
  },
];

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="bg-muted rounded px-1 font-mono text-xs">{children}</code>
);

export default async function ScopesPage() {
  // connection(): los scopes propios vienen del env en runtime, no del build.
  await getPublicAuthConfig();
  const customScopes = env.BETTER_AUTH_OAUTH_SCOPES;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scopes</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-pretty">
          Los scopes definen los permisos que tu aplicación solicita. El
          usuario los revisa en la pantalla de consentimiento antes de
          autorizar.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {scopes.map((scope) => (
          <Card key={scope.name}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">
                  {scope.name}
                </Badge>
                <CardTitle className="text-sm font-normal">
                  {scope.requires}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{scope.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Cómo solicitarlos</h2>
        <p className="text-muted-foreground text-sm">
          En el authorize request, separados por espacio:
        </p>
        <code className="bg-muted block w-fit rounded-md px-3 py-2 font-mono text-xs">
          scope=openid+profile+email+offline_access
        </code>
        <p className="text-muted-foreground text-sm">
          Los scopes que tu cliente puede solicitar están limitados a los
          configurados en su registro. El consentimiento es incremental: si
          una app ya autorizada pide scopes nuevos, el usuario deberá volver a
          aceptar.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Scopes propios de tu API</h2>
        <p className="text-muted-foreground text-sm">
          Además de los scopes OIDC, el gate puede emitir scopes de tus APIs
          (convención <Code>recurso:acción</Code>, p. ej.{" "}
          <Code>todo:read</Code>). Los habilita un administrador en la variable{" "}
          <Code>BETTER_AUTH_OAUTH_SCOPES</Code> del gate; un scope que no esté
          ahí no se puede registrar en ningún cliente (
          <Code>cannot request scope …</Code>).
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">Habilitados en este gate:</span>
          {customScopes.length ? (
            customScopes.map((scope) => (
              <Badge key={scope} variant="outline" className="font-mono">
                {scope}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground">ninguno</span>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          Para que un cliente reciba un scope propio, el scope debe estar en
          los tres sitios: la variable del gate, los scopes del cliente y los{" "}
          <Code>allowedScopes</Code> del resource (si los define).
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          Scopes al pedir un token para un resource
        </h2>
        <p className="text-muted-foreground text-sm">
          Cuando el authorize incluye <Code>resource</Code>, el token lleva solo
          la <strong>intersección</strong> entre los scopes pedidos y los{" "}
          <Code>allowedScopes</Code> del resource (si la lista está vacía, no
          se recorta nada):
        </p>
        <pre className="bg-muted overflow-x-auto rounded-md px-3 py-2 font-mono text-xs">{`pedidos:        openid profile email offline_access todo:read todo:write
allowedScopes:                                      todo:read todo:write
──────────────────────────────────────────────────────────────────────────
token:                                              todo:read todo:write`}</pre>
        <Alert>
          <TriangleAlertIcon data-icon="inline-start" />
          <AlertTitle>Incluye openid en los allowedScopes</AlertTitle>
          <AlertDescription>
            Sin <Code>openid</Code> en el token no hay id_token y{" "}
            <Code>/oauth2/userinfo</Code> responde 400{" "}
            <Code>invalid_scope</Code>; los clientes Better Auth lo muestran
            como <Code>unable_to_get_user_info</Code>. Si una app inicia sesión
            con tokens de ese resource, añade{" "}
            <Code>openid profile email offline_access</Code> a sus
            allowedScopes.
          </AlertDescription>
        </Alert>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Consentimiento</h2>
        <p className="text-muted-foreground text-sm">
          La primera vez que una app solicita acceso, el usuario ve la pantalla
          de consentimiento con los scopes pedidos. Si acepta, la decisión se
          guarda y las siguientes autorizaciones con los mismos scopes se
          procesan sin preguntar. Los clientes marcados como{" "}
          <strong>trusted</strong> omiten la pantalla por completo.
        </p>
      </section>
    </div>
  );
}
