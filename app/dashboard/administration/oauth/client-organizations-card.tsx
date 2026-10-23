"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useListClientOrganizationsQuery } from "./list-client-organizations-query";
import { useLinkClientOrganizationMutation } from "./link-client-organization-mutation";

/**
 * Organizaciones en las que se puede usar la app. Si la app pide el scope
 * `organization`, el usuario elige una de ellas al iniciar sesión y el token
 * lleva su rol y permisos allí (lib/oauth-organizations.ts).
 */
export const ClientOrganizationsCard = ({ clientId }: { clientId: string }) => {
  const organizations = useListClientOrganizationsQuery(clientId);
  const { trigger } = useLinkClientOrganizationMutation();
  const [pending, setPending] = useState<string | null>(null);

  const toggle = async (organizationId: string, next: boolean) => {
    setPending(organizationId);
    try {
      await trigger({ clientId, organizationId, linked: next });
      await organizations.mutate();
      toast.success(next ? "Organización vinculada" : "Organización desvinculada");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al actualizar el vínculo",
      );
    } finally {
      setPending(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organizaciones</CardTitle>
        <CardDescription>
          Organizaciones donde se puede usar esta app. Con el scope{" "}
          <code className="font-mono text-xs">organization</code>, el usuario
          elige una al iniciar sesión y el token incluye su rol y permisos en
          ella.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {organizations.isLoading ? (
          <>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </>
        ) : organizations.error ? (
          <p className="text-sm text-destructive">{organizations.error.message}</p>
        ) : !organizations.data?.length ? (
          <p className="text-sm text-muted-foreground">
            No hay organizaciones registradas.
          </p>
        ) : (
          organizations.data.map((org) => {
            const switchId = `client-org-${org.id}`;
            return (
              <label
                key={org.id}
                htmlFor={switchId}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">{org.name}</span>
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {org.slug}
                  </span>
                </div>
                <Switch
                  id={switchId}
                  checked={org.linked}
                  disabled={pending !== null}
                  onCheckedChange={(next) => toggle(org.id, next)}
                  aria-label={`${org.linked ? "Desvincular" : "Vincular"} ${org.name}`}
                />
              </label>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
