"use client";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import { OAuthResource } from "@better-auth/oauth-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { FC, ReactElement } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useUpdateResourceMutation } from "./update-resource-mutation";
import { resourcesKey } from "./list-resources-query";
import { useSWRConfig } from "swr";
import { ResourceScopesWarning } from "./resource-scopes-warning";
import {
  resourceFormSchema,
  ResourceFormData,
  toResourceInput,
} from "./resource-schema";

export interface UpdateResourceDialogProps {
  resource: OAuthResource;
  children: ReactElement;
}

export const UpdateResourceDialog: FC<UpdateResourceDialogProps> = ({
  resource,
  children,
}) => {
  const mutation = useUpdateResourceMutation();
  const { mutate } = useSWRConfig();

  const form = useForm<ResourceFormData>({
    resolver: zodResolver(resourceFormSchema),
    mode: "onChange",
    defaultValues: {
      identifier: resource.identifier,
      name: resource.name ?? "",
      allowedScopes: resource.allowedScopes?.join(", ") ?? "",
      accessTokenTtl: resource.accessTokenTtl?.toString() ?? "",
      refreshTokenTtl: resource.refreshTokenTtl?.toString() ?? "",
      dpopBoundAccessTokensRequired: resource.dpopBoundAccessTokensRequired ?? false,
      disabled: resource.disabled ?? false,
      metadata: resource.metadata ? JSON.stringify(resource.metadata) : "",
    },
  });

  const onSubmit = async (data: ResourceFormData) => {
    try {
      await mutation.trigger({
        identifier: resource.identifier,
        body: toResourceInput(data),
      });
      await mutate(resourcesKey);
      toast.success("Resource actualizado");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al actualizar el resource",
      );
    }
  };

  return (
    <Dialog>
      <DialogTrigger render={children} />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FieldSet>
              <FieldLegend>Editar Resource</FieldLegend>
              <FieldDescription>
                El identifier no se puede cambiar (es la clave de negocio del
                resource).
              </FieldDescription>
              <FieldGroup className="grid grid-cols-1 gap-4">
                <Controller
                  name="identifier"
                  control={form.control}
                  render={({ field }) => (
                    <Field orientation="vertical">
                      <FieldLabel htmlFor={field.name}>Identifier</FieldLabel>
                      <Input {...field} id={field.name} disabled className="h-9" />
                    </Field>
                  )}
                />
                <Controller
                  name="name"
                  control={form.control}
                  render={({ field }) => (
                    <Field orientation="vertical">
                      <FieldLabel htmlFor={field.name}>Nombre</FieldLabel>
                      <Input {...field} id={field.name} className="h-9" />
                    </Field>
                  )}
                />
                <Controller
                  name="allowedScopes"
                  control={form.control}
                  render={({ field }) => (
                    <Field orientation="vertical">
                      <FieldLabel htmlFor={field.name}>
                        Allowed scopes (separados por coma)
                      </FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        placeholder="user:read, user:write"
                        className="h-9"
                      />
                      <FieldDescription>
                        Vacío = sin restricción. Si lo rellenas, los tokens
                        sólo llevan estos scopes: incluye los OIDC (openid,
                        profile, email…) si una app inicia sesión con él.
                      </FieldDescription>
                      <ResourceScopesWarning
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </Field>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Controller
                    name="accessTokenTtl"
                    control={form.control}
                    render={({ field }) => (
                      <Field orientation="vertical">
                        <FieldLabel htmlFor={field.name}>Access token TTL (s)</FieldLabel>
                        <Input
                          {...field}
                          id={field.name}
                          type="number"
                          placeholder="3600"
                          className="h-9"
                        />
                      </Field>
                    )}
                  />
                  <Controller
                    name="refreshTokenTtl"
                    control={form.control}
                    render={({ field }) => (
                      <Field orientation="vertical">
                        <FieldLabel htmlFor={field.name}>Refresh token TTL (s)</FieldLabel>
                        <Input
                          {...field}
                          id={field.name}
                          type="number"
                          placeholder="604800"
                          className="h-9"
                        />
                      </Field>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-4">
                  <Controller
                    name="dpopBoundAccessTokensRequired"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <FieldLabel htmlFor={field.name}>DPoP obligatorio</FieldLabel>
                          <FieldDescription>
                            Tokens bound a clave DPoP del client (RFC 9449).
                          </FieldDescription>
                        </div>
                        <Switch
                          id={field.name}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </div>
                    )}
                  />
                  <Controller
                    name="disabled"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <FieldLabel htmlFor={field.name}>Disabled</FieldLabel>
                          <FieldDescription>
                            Bloquea la emisión de tokens para este resource.
                          </FieldDescription>
                        </div>
                        <Switch
                          id={field.name}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </div>
                    )}
                  />
                </div>
                <Controller
                  name="metadata"
                  control={form.control}
                  render={({ field }) => (
                    <Field orientation="vertical">
                      <FieldLabel htmlFor={field.name}>
                        Metadata (JSON opcional)
                      </FieldLabel>
                      <Textarea
                        {...field}
                        id={field.name}
                        placeholder='{"equipo":"backend"}'
                        className="min-h-20"
                      />
                    </Field>
                  )}
                />
              </FieldGroup>
            </FieldSet>
            <Button
              type="submit"
              className="self-end"
              disabled={mutation.isMutating}
            >
              {mutation.isMutating ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};