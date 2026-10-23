"use client";

import { Badge } from "@/components/ui/badge";
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
import Link from "next/link";
import { useState } from "react";
import { useListResourcesQuery } from "./list-resources-query";
import { useListClientResourcesQuery } from "./list-client-resources-query";
import { useLinkClientResourceMutation } from "./link-client-resource-mutation";

/**
 * Vincula/desvincula el client con los resources (RFC 8707). Con
 * `enforcePerClientResources` (default true) un client sólo puede pedir
 * tokens para los resources marcados aquí.
 */
export const ClientResourcesCard = ({ clientId }: { clientId: string }) => {
  const resources = useListResourcesQuery();
  const linked = useListClientResourcesQuery(clientId);
  const { trigger } = useLinkClientResourceMutation();
  const [pending, setPending] = useState<string | null>(null);

  const toggle = async (identifier: string, next: boolean) => {
    setPending(identifier);
    try {
      await trigger({ identifier, clientId, linked: next });
      await linked.mutate();
      toast.success(next ? "Resource vinculado" : "Resource desvinculado");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al actualizar el vínculo",
      );
    } finally {
      setPending(null);
    }
  };

  const isLoading = resources.isLoading || linked.isLoading;
  const error = resources.error ?? linked.error;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resources (RFC 8707)</CardTitle>
        <CardDescription>
          APIs para las que este cliente puede solicitar access tokens con el
          parámetro <code className="font-mono text-xs">resource</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {isLoading ? (
          <>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </>
        ) : error ? (
          <p className="text-sm text-destructive">{error.message}</p>
        ) : !resources.data?.length ? (
          <p className="text-sm text-muted-foreground">
            No hay resources registrados.{" "}
            <Link
              href="/dashboard/administration/oauth"
              className="underline underline-offset-4"
            >
              Crea uno en la pestaña Resources
            </Link>
            .
          </p>
        ) : (
          resources.data.map((resource) => {
            const checked = linked.data?.includes(resource.identifier) ?? false;
            const switchId = `client-resource-${resource.identifier}`;
            return (
              <label
                key={resource.identifier}
                htmlFor={switchId}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {resource.name || resource.identifier}
                    {resource.disabled && (
                      <Badge variant="destructive" className="text-[10px]">
                        Disabled
                      </Badge>
                    )}
                  </span>
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {resource.identifier}
                  </span>
                </div>
                <Switch
                  id={switchId}
                  checked={checked}
                  disabled={pending !== null}
                  onCheckedChange={(next) => toggle(resource.identifier, next)}
                  aria-label={`${checked ? "Desvincular" : "Vincular"} ${resource.identifier}`}
                />
              </label>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
