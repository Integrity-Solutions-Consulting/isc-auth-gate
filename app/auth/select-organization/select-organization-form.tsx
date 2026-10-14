"use client";

import { authClient } from "@/lib/auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { BuildingIcon, CommandIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AllowedOrganization } from "@/lib/oauth-organizations";
import { OAuthRequestExpired } from "@/components/oauth-request-expired";
import { isInvalidSignature } from "@/lib/oauth-flow";

export function SelectOrganizationForm({
  oauthQuery,
  clientName,
  organizations,
}: {
  oauthQuery: string;
  clientName: string | null;
  organizations: AllowedOrganization[];
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const autoSelected = useRef(false);

  const select = async (organizationId: string) => {
    setPending(organizationId);
    setError(null);
    // 1. org activa en la sesión del gate → shouldRedirect deja pasar y
    //    consentReferenceId la liga al consentimiento y a los tokens.
    const active = await authClient.organization.setActive({ organizationId });
    if (active.error) {
      setError(active.error.message ?? "No se pudo seleccionar la organización.");
      setPending(null);
      return;
    }
    // 2. reanuda el authorize (consentimiento o redirect con code).
    const { data, error } = await authClient.oauth2.continue({
      postLogin: true,
      oauth_query: oauthQuery,
    });
    if (isInvalidSignature(error)) {
      setExpired(true);
      setPending(null);
      return;
    }
    if (error || !data?.url) {
      setError(error?.message ?? "No se pudo continuar con la autorización.");
      setPending(null);
      return;
    }
    window.location.href = data.url;
  };

  // Con una sola organización posible no hay nada que elegir.
  useEffect(() => {
    if (organizations.length === 1 && !autoSelected.current) {
      autoSelected.current = true;
      void select(organizations[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizations]);

  const app = clientName ?? "La aplicación";

  return (
    <div className="flex min-h-svh flex-col gap-4 p-6 md:p-10">
      <Link href="/" className="flex items-center gap-2 font-medium">
        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
          <CommandIcon className="size-4" />
        </div>
        ISC Gate
      </Link>

      <div className="flex flex-1 items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Elige una organización</CardTitle>
            <CardDescription>
              {organizations.length
                ? `${app} usará tu rol y permisos en la organización que elijas.`
                : `No perteneces a ninguna organización habilitada para ${app}. Pide a un administrador que te agregue.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {organizations.map((org) => (
              <Button
                key={org.id}
                variant="outline"
                className="h-auto justify-start gap-3 py-3"
                disabled={pending !== null}
                onClick={() => select(org.id)}
              >
                <Avatar className="size-8">
                  <AvatarImage src={org.logo || undefined} alt={org.name} />
                  <AvatarFallback>
                    <BuildingIcon className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 flex-1 flex-col items-start">
                  <span className="truncate font-medium">{org.name}</span>
                  <span className="text-muted-foreground truncate font-mono text-xs">
                    {org.slug}
                  </span>
                </span>
                {pending === org.id ? (
                  <Spinner />
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    {org.role}
                  </Badge>
                )}
              </Button>
            ))}
            {expired && <OAuthRequestExpired />}
            {error && <p className="text-destructive text-sm">{error}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
