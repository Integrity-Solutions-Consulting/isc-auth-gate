import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRightIcon, GlobeIcon, KeyRoundIcon, ShieldIcon } from "lucide-react";
import Link from "next/link";
import { getPublicAuthConfig } from "@/lib/runtime-config";

const guides = [
  {
    href: "/developers/quickstart",
    title: "Quickstart",
    description:
      "Registra tu app, obtén credenciales y haz tu primer request en 5 minutos.",
    icon: KeyRoundIcon,
  },
  {
    href: "/developers/flows",
    title: "Authorization Code + PKCE",
    description:
      "El flujo recomendado para apps web y móviles, con ejemplo curl completo.",
    icon: ShieldIcon,
  },
  {
    href: "/developers/scopes",
    title: "Scopes",
    description:
      "Permisos que puedes solicitar y qué datos expone cada uno.",
    icon: GlobeIcon,
  },
  {
    href: "/developers/m2m",
    title: "Machine to Machine",
    description:
      "Client credentials para servicios que se autentican sin usuario.",
    icon: KeyRoundIcon,
  },
  {
    href: "/developers/resource-server",
    title: "Resource Server",
    description:
      "Registra tu API como resource y verifica los access tokens (JWKS o introspect).",
    icon: ShieldIcon,
  },
  {
    href: "/developers/better-auth",
    title: "Cliente Better Auth",
    description:
      "Receta probada con genericOAuth: login, refresh, logout y llamadas a tu API.",
    icon: KeyRoundIcon,
  },
  {
    href: "/developers/troubleshooting",
    title: "Solución de problemas",
    description:
      "invalid_target, unable_to_get_user_info, invalid_client… causa y solución.",
    icon: GlobeIcon,
  },
];

export default async function DevelopersOverview() {
  const { baseUrl } = await getPublicAuthConfig();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          ISC Auth Developers
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-pretty">
          ISC Auth es un servidor de autorización OAuth 2.1 / OpenID Connect
          (RFC 8414) que permite a aplicaciones de terceros autenticar usuarios
          y acceder a sus datos de forma segura. Esta guía documenta los
          flujos, endpoints y buenas prácticas de integración.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">OAuth 2.1</Badge>
        <Badge variant="secondary">OpenID Connect</Badge>
        <Badge variant="secondary">PKCE (S256)</Badge>
        <Badge variant="outline">{baseUrl}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {guides.map((guide) => {
          const Icon = guide.icon;
          return (
            <Link key={guide.href} href={guide.href}>
              <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="text-primary size-4" />
                    <CardTitle className="text-base">{guide.title}</CardTitle>
                  </div>
                  <CardDescription>{guide.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-1 text-sm">
                  <span className="text-primary">Leer guía</span>
                  <ArrowRightIcon className="text-primary size-3.5" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Descubrimiento (Discovery)</h2>
        <p className="text-muted-foreground max-w-2xl text-sm text-pretty">
          El servidor publica su configuración en los estándares RFC 8414 y
          OIDC. La mayoría de SDKs pueden configurarse solo con la URL del
          issuer.
        </p>
        <ul className="text-muted-foreground flex flex-col gap-1 text-sm">
          <li>
            Issuer:{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              {baseUrl}/api/auth
            </code>
          </li>
          <li>
            Authorization Server Metadata:{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              {baseUrl}/.well-known/oauth-authorization-server/api/auth
            </code>
          </li>
          <li>
            OpenID Configuration:{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              {baseUrl}/api/auth/.well-known/openid-configuration
            </code>
          </li>
          <li>
            OpenAPI / Swagger UI:{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              {baseUrl}/api/auth/reference
            </code>
          </li>
        </ul>
      </div>
    </div>
  );
}
