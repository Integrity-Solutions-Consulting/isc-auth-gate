"use client";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { FC, ReactElement } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useCreateResourceMutation } from "./create-resource-mutation";
import { resourcesKey } from "./list-resources-query";
import { useSWRConfig } from "swr";
import { ResourceScopesWarning } from "./resource-scopes-warning";
import {
  resourceFormSchema,
  ResourceFormData,
  toResourceInput,
} from "./resource-schema";

export interface CreateResourceDialogProps {
  children: ReactElement;
}

export const CreateResourceDialog: FC<CreateResourceDialogProps> = ({
  children,
}) => {
  const mutation = useCreateResourceMutation();
  const { mutate } = useSWRConfig();

  const form = useForm<ResourceFormData>({
    resolver: zodResolver(resourceFormSchema),
    mode: "onChange",
    defaultValues: {
      identifier: "",
      name: "",
      allowedScopes: "",
      accessTokenTtl: "",
      refreshTokenTtl: "",
      dpopBoundAccessTokensRequired: false,
      disabled: false,
      metadata: "",
    },
  });

  const onSubmit = async (data: ResourceFormData) => {
    try {
      await mutation.trigger(toResourceInput(data));
      await mutate(resourcesKey);
      toast.success("Resource creado");
      form.reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al crear el resource",
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
              <FieldLegend>Nuevo Resource (RFC 8707)</FieldLegend>
              <FieldDescription>
                API protegida que valida los access tokens de este authorization
                server. El identifier viaja en el claim <code>aud</code> del
                token.
              </FieldDescription>
              <FieldGroup className="grid grid-cols-1 gap-4">
                <Controller
                  name="identifier"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field orientation="vertical" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Identifier</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        placeholder="https://api.miapp.com"
                        aria-invalid={fieldState.invalid}
                        className="h-9"
                      />
                      <FieldDescription>
                        URI de la API. Los clients la solicitan vía el parámetro{" "}
                        <code>resource</code>.
                      </FieldDescription>
                      {fieldState.error && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="name"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field orientation="vertical" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Nombre</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        placeholder="API de producción"
                        aria-invalid={fieldState.invalid}
                        className="h-9"
                      />
                      {fieldState.error && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="allowedScopes"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field orientation="vertical" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>
                        Allowed scopes (separados por coma)
                      </FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        placeholder="user:read, user:write"
                        aria-invalid={fieldState.invalid}
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
                      {fieldState.error && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Controller
                    name="accessTokenTtl"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field orientation="vertical" data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>
                          Access token TTL (s)
                        </FieldLabel>
                        <Input
                          {...field}
                          id={field.name}
                          type="number"
                          placeholder="3600"
                          aria-invalid={fieldState.invalid}
                          className="h-9"
                        />
                        {fieldState.error && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                  <Controller
                    name="refreshTokenTtl"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field orientation="vertical" data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>
                          Refresh token TTL (s)
                        </FieldLabel>
                        <Input
                          {...field}
                          id={field.name}
                          type="number"
                          placeholder="604800"
                          aria-invalid={fieldState.invalid}
                          className="h-9"
                        />
                        {fieldState.error && (
                          <FieldError errors={[fieldState.error]} />
                        )}
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
                  render={({ field, fieldState }) => (
                    <Field orientation="vertical" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>
                        Metadata (JSON opcional)
                      </FieldLabel>
                      <Textarea
                        {...field}
                        id={field.name}
                        placeholder='{"equipo":"backend"}'
                        aria-invalid={fieldState.invalid}
                        className="min-h-20"
                      />
                      {fieldState.error && (
                        <FieldError errors={[fieldState.error]} />
                      )}
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
              {mutation.isMutating ? "Creando..." : "Crear resource"}
            </Button>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};