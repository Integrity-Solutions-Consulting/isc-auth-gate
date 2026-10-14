"use client";

import { OAuthRequestExpired } from "@/components/oauth-request-expired";
import { isInvalidSignature, oauthExpiredHref } from "@/lib/oauth-flow";
import { authClient } from "@/lib/auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { GridPattern } from "@/components/ui/grid-pattern";
import { Skeleton } from "@/components/ui/skeleton";
import { CommandIcon, ExternalLinkIcon, ShieldCheckIcon, BadgeCheckIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const scopeDescriptions: Record<string, string> = {
  openid: "Verificar tu identidad",
  profile: "Leer la información de tu perfil",
  email: "Leer tu dirección de correo electrónico",
  offline_access: "Acceso en segundo plano (cuando no estás conectado)",
};

function ConsentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [client, setClient] = useState<{
    client_name?: string;
    client_uri?: string;
    logo_uri?: string;
    tos_uri?: string;
    policy_uri?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expired, setExpired] = useState(false);

  const clientId = searchParams.get("client_id");
  const scopeParam = searchParams.get("scope");

  const scopes = useMemo(
    () => (scopeParam ? scopeParam.split(" ").filter(Boolean) : []),
    [scopeParam],
  );

  const oauthQuery = useMemo(() => searchParams.toString(), [searchParams]);

  const missingClientId = !clientId;

  useEffect(() => {
    if (!clientId) return;

    let cancelled = false;

    (async () => {
      const { data, error } = await authClient.oauth2.publicClient({
        query: { client_id: clientId },
      });
      if (cancelled) return;

      if (error || !data) {
        if (error?.status === 401) {
          router.replace(
            `/auth/sign-in?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}`,
          );
          return;
        }
        setError(
          error?.message ??
            "No se pudo cargar la información de la aplicación.",
        );
        return;
      }
      setClient(data);
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId, router]);

  const handleConsent = async (accept: boolean) => {
    setIsSubmitting(true);
    try {
      const { data, error } = await authClient.oauth2.consent({
        accept,
        oauth_query: oauthQuery,
      });
      if (error) {
      if (isInvalidSignature(error)) {
        setExpired(true);
        setIsSubmitting(false);
        return;
      }
        setError(error.message ?? "No se pudo procesar la autorización.");
        setIsSubmitting(false);
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      setError("La aplicación no devolvió una URI de redirección.");
      setIsSubmitting(false);
    } catch {
      setError("Ocurrió un error al procesar la autorización.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background">
      <GridPattern
        className={cn(
          "mask-[radial-gradient(300px_circle_at_center,white,transparent)]",
          "inset-x-0 inset-y-[-70%] h-[200%] skew-y-12 scale-150 opacity-40 dark:opacity-80",
        )}
      />

      <div className="grid min-h-svh w-full grid-cols-1 absolute">
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <div className="flex w-full justify-between">
            <Link href="/" className="flex items-center gap-2 font-medium">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <CommandIcon className="size-4" />
              </div>
              ISC Gate
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                {client ? (
                  <Avatar className="mx-auto size-14">
                    <AvatarImage
                      src={client.logo_uri || undefined}
                      alt={client.client_name || clientId || "App"}
                    />
                    <AvatarFallback>
                      {(client.client_name || clientId || "A")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Skeleton className="mx-auto size-14 rounded-full" />
                )}
                <CardTitle className="mt-3 text-xl">
                  {error ? "No se pudo continuar" : (
                    client ? (
                      <>
                        <span className="font-semibold">
                          {client.client_name || clientId}
                        </span>{" "}
                        quiere acceder a tu cuenta
                      </>
                    ) : (
                      <Skeleton className="mx-auto h-6 w-3/4" />
                    )
                  )}
                </CardTitle>
                <CardDescription>
                  {error ??
                    (missingClientId
                      ? "Solicitud de autorización inválida: falta client_id."
                      : client
                        ? "Revisa los permisos solicitados antes de continuar."
                        : "Cargando información de la aplicación...")}
                </CardDescription>
                {client && !error && (
                  <div className="mt-3 flex justify-center">
                    <Badge variant="secondary" className="gap-1">
                      <BadgeCheckIcon className="size-3" />
                      Aplicación registrada en ISC Gate
                    </Badge>
                  </div>
                )}
              </CardHeader>

              {!error && (
                <CardContent className="space-y-4">
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                      Permisos solicitados
                    </p>
                    <div className="flex flex-col gap-2">
                      {scopes.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Sin permisos adicionales.
                        </p>
                      )}
                      {scopes.map((scope) => (
                        <div
                          key={scope}
                          className="flex items-start gap-2 text-sm"
                        >
                          <ShieldCheckIcon className="text-primary mt-0.5 size-4 shrink-0" />
                          <div>
                            <p className="font-mono text-xs font-medium">
                              {scope}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {scopeDescriptions[scope] ??
                                `Acceso al scope "${scope}".`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-3">
                    {client?.client_uri && (
                      <Link
                        href={client.client_uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
                      >
                        Sitio de la app
                        <ExternalLinkIcon className="size-3" />
                      </Link>
                    )}
                    {client?.tos_uri && (
                      <Link
                        href={client.tos_uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
                      >
                        Términos
                        <ExternalLinkIcon className="size-3" />
                      </Link>
                    )}
                    {client?.policy_uri && (
                      <Link
                        href={client.policy_uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
                      >
                        Política de privacidad
                        <ExternalLinkIcon className="size-3" />
                      </Link>
                    )}
                  </div>
                </CardContent>
              )}

              <CardFooter className="flex flex-col gap-2">
              {expired ? (
                <CardFooter>
                  <div className="w-full">
                    <OAuthRequestExpired />
                  </div>
                </CardFooter>
              ) : (
                {!error && (
                  <p className="mb-1 text-center text-xs text-muted-foreground">
                    Tu contraseña nunca se comparte con la aplicación.
                  </p>
                )}
                {error ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      window.location.assign(oauthExpiredHref(window.location.search))
                    }
                  >
                    Volver a la aplicación
                  </Button>
                ) : (
                  <>
                    <Button
                      className="w-full"
                      disabled={!client || isSubmitting}
                      onClick={() => handleConsent(true)}
                    >
                      {isSubmitting ? "Procesando..." : "Autorizar"}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={!client || isSubmitting}
                      onClick={() => handleConsent(false)}
                    >
                      Rechazar
                    </Button>
                    {clientId && (
                      <Badge
                        variant="outline"
                        className="font-mono mt-1 text-[10px] text-muted-foreground"
                      >
                        {clientId}
                      </Badge>
                    )}
                  </>
                )}
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
              )}

export default function ConsentPage() {
  return (
    <Suspense>
      <ConsentContent />
    </Suspense>
  );
}
