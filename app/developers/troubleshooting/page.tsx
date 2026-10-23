import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="bg-muted rounded px-1 font-mono text-xs">{children}</code>
);

// Cada fila es un error reproducido contra el gate (no hipotético).
const problems: {
  error: string;
  where: string;
  cause: React.ReactNode;
  fix: React.ReactNode;
}[] = [
  {
    error: "unable_to_get_user_info",
    where: "Callback de un cliente Better Auth",
    cause: (
      <>
        El token se pidió con <Code>resource</Code> y los allowedScopes del
        resource no incluyen <Code>openid</Code>: no hay id_token y userinfo
        responde 400 <Code>invalid_scope</Code>.
      </>
    ),
    fix: (
      <>
        Añade <Code>openid profile email offline_access</Code> a los
        allowedScopes del resource (el panel avisa y lo hace con un botón).
      </>
    ),
  },
  {
    error: "invalid_target",
    where: "authorize / token",
    cause: (
      <>
        El <Code>resource</Code> no existe, está deshabilitado o el cliente no
        está vinculado a él.
      </>
    ),
    fix: (
      <>
        Revisa que el identifier sea idéntico y vincula el resource en el
        detalle del cliente (tarjeta &quot;Resources&quot;).
      </>
    ),
  },
  {
    error: "invalid_scope",
    where: "authorize / token",
    cause: (
      <>
        Pediste un scope que no está en los scopes del cliente, o ninguno de
        los pedidos está en los allowedScopes del resource.
      </>
    ),
    fix: <>Ajusta los scopes del cliente o los allowedScopes del resource.</>,
  },
  {
    error: "cannot request scope …",
    where: "Crear o editar un cliente",
    cause: (
      <>
        El scope no está habilitado en el gate (
        <Code>BETTER_AUTH_OAUTH_SCOPES</Code>).
      </>
    ),
    fix: <>Pide a un administrador que lo añada y reinicie el gate.</>,
  },
  {
    error: "invalid_client",
    where: "token",
    cause: (
      <>
        Secret incorrecto o método de autenticación distinto del registrado (
        <Code>client_secret_basic</Code> vs <Code>client_secret_post</Code>).
        Better Auth usa <Code>post</Code> por defecto.
      </>
    ),
    fix: (
      <>
        Iguala el método (en genericOAuth: <Code>authentication: &quot;basic&quot;</Code>
        ) o rota el secret.
      </>
    ),
  },
  {
    error: "invalid_grant",
    where: "token (authorization_code)",
    cause: (
      <>
        Code ya usado o expirado (10 min), <Code>redirect_uri</Code> distinta
        de la del authorize, o <Code>code_verifier</Code> que no corresponde al
        challenge.
      </>
    ),
    fix: (
      <>
        Challenge = base64url(SHA-256(verifier)) sin <Code>=</Code>: convierte{" "}
        <Code>+/</Code> a <Code>-_</Code>, no los borres.
      </>
    ),
  },
  {
    error: "Errores TLS (self signed / unable to verify)",
    where: "Servidor de tu app llamando al gate",
    cause: <>El gate usa un certificado de una CA local en desarrollo.</>,
    fix: (
      <>
        Arranca tu app con <Code>NODE_EXTRA_CA_CERTS=/ruta/rootCA.pem</Code>.
      </>
    ),
  },
  {
    error: "La sesión se pierde o se mezcla",
    where: "App y gate en el mismo host (localhost / IP)",
    cause: (
      <>
        Las cookies no se aíslan por puerto: dos apps Better Auth con el
        prefijo por defecto se pisan las cookies.
      </>
    ),
    fix: (
      <>
        Usa <Code>advanced.cookiePrefix</Code> propio en tu app.
      </>
    ),
  },
  {
    error: "401 en tu API con un token válido",
    where: "Resource server",
    cause: (
      <>
        <Code>audience</Code> distinto del identifier del resource, issuer con
        barra final, o token opaco (pedido sin <Code>resource</Code>).
      </>
    ),
    fix: (
      <>
        Valida <Code>aud</Code> = identifier y <Code>iss</Code> = issuer del
        discovery; pide el token con <Code>resource</Code>.
      </>
    ),
  },
];

export default function TroubleshootingPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Solución de problemas
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-pretty">
          Errores habituales al conectar una app al gate, su causa y cómo
          resolverlos.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Error</TableHead>
            <TableHead>Dónde</TableHead>
            <TableHead>Causa</TableHead>
            <TableHead>Solución</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {problems.map((p) => (
            <TableRow key={p.error} className="align-top">
              <TableCell className="font-mono text-xs whitespace-normal">
                {p.error}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm whitespace-normal">
                {p.where}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm whitespace-normal">
                {p.cause}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm whitespace-normal">
                {p.fix}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
