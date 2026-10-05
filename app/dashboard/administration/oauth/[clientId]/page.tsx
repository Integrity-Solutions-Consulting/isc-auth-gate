"use client";

import { useGetOAuthClientQuery } from "../get-oauth-client-query";
import { useUpdateOauthClientMutation } from "../update-oauth-client-mutation";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { toast } from "@/components/ui/sonner";
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { shortName } from "@/lib/utils";
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  Link2Icon,
  PowerIcon,
  RefreshCcwIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";
import { RotateSecretOauthClientDialog } from "../rotate-secret-oauth-client-dialog";
import { useDeleteOauthClientMutation } from "../delete-oauth-client-mutation";
import { useAdminDisableClient } from "@/hooks/use-admin-disable-client";
import { isTrustedClient } from "@/lib/oauth-trusted-clients";
import { useSWRConfig } from "swr";
import { OAuthClient } from "@better-auth/oauth-provider";
import { ClientResourcesCard } from "../client-resources-card";

const CopyButton: React.FC<{ value: string }> = ({ value }) => {
  const [copy, isCopied] = useCopyToClipboard();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7"
      aria-label="Copiar"
      title="Copiar"
      onClick={() => {
        copy(value);
        toast.success("Copiado");
      }}
    >
      {isCopied ? (
        <CheckIcon className="size-3.5" />
      ) : (
        <CopyIcon className="size-3.5" />
      )}
    </Button>
  );
};

const grantOptions = [
  "authorization_code",
  "client_credentials",
  "refresh_token",
  "urn:ietf:params:oauth:grant-type:device_code",
] as const;

function ClientDetailForm({
  client,
  onMutate,
}: {
  client: OAuthClient;
  onMutate: () => Promise<unknown>;
}) {
  const updateMutation = useUpdateOauthClientMutation();
  const deleteMutation = useDeleteOauthClientMutation();
  const { mutate: mutateList } = useSWRConfig();

  const [redirectUris, setRedirectUris] = useState<string[]>(
    client.redirect_uris ?? [],
  );
  const [postLogoutUris, setPostLogoutUris] = useState<string[]>(
    client.post_logout_redirect_uris ?? [],
  );
  const [uriDraft, setUriDraft] = useState("");
  const [postLogoutDraft, setPostLogoutDraft] = useState("");
  const [scope, setScope] = useState(client.scope ?? "openid profile email");
  const [grantTypes, setGrantTypes] = useState<string[]>(
    client.grant_types ?? ["authorization_code"],
  );
  const [applicationType, setApplicationType] = useState<
    "web" | "native"
  >(client.application_type === "native" ? "native" : "web");
  const [settingsDirty, setSettingsDirty] = useState(false);

  const addUri = (
    list: string[],
    setter: (v: string[]) => void,
    draft: string,
    setDraft: (v: string) => void,
  ) => {
    const value = draft.trim();
    if (!value) return;
    setter([...list, value]);
    setDraft("");
    setSettingsDirty(true);
  };

  const removeUri = (
    list: string[],
    setter: (v: string[]) => void,
    index: number,
  ) => {
    setter(list.filter((_, i) => i !== index));
    setSettingsDirty(true);
  };

  const saveUris = async () => {
    if (redirectUris.length === 0) {
      toast.error("Al menos una Redirect URI es requerida");
      return;
    }
    try {
      await updateMutation.trigger({
        client_id: client.client_id,
        update: {
          redirect_uris: redirectUris,
          post_logout_redirect_uris: postLogoutUris,
        },
      });
      toast.success("Redirect URIs actualizadas");
      setSettingsDirty(false);
      await onMutate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al actualizar",
      );
    }
  };

  const saveSettings = async () => {
    if (grantTypes.length === 0) {
      toast.error("Al menos un grant type es requerido");
      return;
    }
    try {
      await updateMutation.trigger({
        client_id: client.client_id,
        update: {
          scope,
          grant_types: grantTypes as (typeof grantOptions)[number][],
          application_type: applicationType as "web" | "native",
        },
      });
      toast.success("Configuración guardada");
      setSettingsDirty(false);
      await onMutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.trigger({ client_id: client.client_id });
      toast.success("Cliente eliminado");
      await mutateList(["/oauth2/get-clients"]);
      window.location.href = "/dashboard/administration/oauth";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar");
    }
  };

  const { disableClient } = useAdminDisableClient();
  const [isDisabling, setIsDisabling] = useState(false);

  const handleToggleDisabled = async () => {
    setIsDisabling(true);
    try {
      await disableClient({
        clientId: client.client_id,
        disabled: !client.disabled,
      });
      toast.success(client.disabled ? "Cliente habilitado" : "Cliente deshabilitado");
      await onMutate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al cambiar el estado",
      );
    } finally {
      setIsDisabling(false);
    }
  };

  const clientIdShort = `${client.client_id.slice(0, 12)}...`;
  const trusted = isTrustedClient(client.client_id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-11">
            <AvatarImage
              src={client.logo_uri || undefined}
              alt={client.client_name || clientIdShort}
            />
            <AvatarFallback>
              {shortName(client.client_name || clientIdShort)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                {client.client_name || clientIdShort}
              </h1>
              {client.disabled ? (
                <Badge variant="destructive" className="text-[10px]">
                  Disabled
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">
                  Active
                </Badge>
              )}
              {client.skip_consent && (
                <Badge variant="outline" className="text-[10px]">
                  Trusted
                </Badge>
              )}
              {isTrustedClient(client.client_id) && (
                <Badge
                  variant="outline"
                  className="border-primary/30 bg-primary/10 text-[10px] text-primary"
                >
                  First-party
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {client.client_id}
              </span>
              <CopyButton value={client.client_id} />
            </div>
          </div>
        </div>

        <Button
          nativeButton={false}
          variant="outline"
          size="sm"
          render={<Link href="/dashboard/administration/oauth" />}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Volver
        </Button>
      </div>

      <Separator />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* CREDENTIALS */}
        <Card>
          <CardHeader>
            <CardTitle>Credenciales</CardTitle>
            <CardDescription>
              Método de autenticación y estado del client secret.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Autenticación</span>
              <Badge variant="outline" className="font-mono text-[10px]">
                {client.token_endpoint_auth_method ?? "client_secret_basic"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tipo</span>
              <span className="capitalize">{client.application_type ?? "web"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Creado</span>
              <span>
                {client.client_id_issued_at
                  ? format(
                      new Date(client.client_id_issued_at * 1000),
                      "MMM d, yyyy",
                    )
                  : "—"}
              </span>
            </div>
            {client.client_secret_expires_at ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Secret expira</span>
                <span>
                  {format(
                    new Date(client.client_secret_expires_at * 1000),
                    "MMM d, yyyy",
                  )}
                </span>
              </div>
            ) : null}
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm">
                <RefreshCcwIcon className="size-4" />
                Client secret
              </div>
              {trusted ? (
                <span className="text-muted-foreground text-xs">
                  Trusted (first-party) — gestionado por configuración
                </span>
              ) : (
                <RotateSecretOauthClientDialog client={client}>
                  <Button size="sm" variant="outline">
                    <RefreshCcwIcon data-icon="inline-start" />
                    Rotar secret
                  </Button>
                </RotateSecretOauthClientDialog>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SCOPES + GRANTS */}
        <Card>
          <CardHeader>
            <CardTitle>Scopes y grants</CardTitle>
            <CardDescription>Permisos y flujos permitidos.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Field orientation="vertical">
              <FieldLabel>Scopes</FieldLabel>
              <div className="flex flex-wrap gap-1">
                {(client.scope ?? "openid profile email")
                  .split(" ")
                  .filter(Boolean)
                  .map((s) => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="font-mono text-[10px]"
                    >
                      {s}
                    </Badge>
                  ))}
              </div>
            </Field>
            <Field orientation="vertical">
              <FieldLabel>Grant types</FieldLabel>
              <div className="flex flex-wrap gap-1">
                {(client.grant_types ?? ["authorization_code"]).map((g) => (
                  <Badge
                    key={g}
                    variant="outline"
                    className="font-mono text-[10px]"
                  >
                    {g}
                  </Badge>
                ))}
              </div>
            </Field>
            <Field orientation="vertical">
              <FieldLabel>Subject type</FieldLabel>
              <span className="text-sm">{client.subject_type ?? "public"}</span>
            </Field>
          </CardContent>
        </Card>
      </div>

      {/* REDIRECT URIs */}
      <Card>
        <CardHeader>
          <CardTitle>Redirect URIs</CardTitle>
          <CardDescription>
            Únicos destinos permitidos tras la autorización.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <FieldLabel>Redirect URIs</FieldLabel>
              {settingsDirty && (
                <Button
                  size="sm"
                  onClick={saveUris}
                  disabled={updateMutation.isMutating}
                >
                  <CheckIcon data-icon="inline-start" />
                  Guardar
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {redirectUris.map((uri, i) => (
                <Badge
                  key={`${uri}-${i}`}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  <span className="max-w-60 truncate font-mono text-[10px]">
                    {uri}
                  </span>
                  <button
                    type="button"
                    aria-label={`Quitar ${uri}`}
                    className="rounded-full p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                    onClick={() => removeUri(redirectUris, setRedirectUris, i)}
                  >
                    <XIcon className="size-3" />
                  </button>
                </Badge>
              ))}
              {redirectUris.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  Sin URIs registradas
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://miapp.com/callback"
                className="h-9"
                value={uriDraft}
                onChange={(e) => setUriDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addUri(
                      redirectUris,
                      setRedirectUris,
                      uriDraft,
                      setUriDraft,
                    );
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() =>
                  addUri(redirectUris, setRedirectUris, uriDraft, setUriDraft)
                }
              >
                <Link2Icon data-icon="inline-start" />
                Agregar
              </Button>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            <FieldLabel>Post-logout redirect URIs</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {postLogoutUris.map((uri, i) => (
                <Badge
                  key={`${uri}-${i}`}
                  variant="outline"
                  className="gap-1 pr-1"
                >
                  <span className="max-w-60 truncate font-mono text-[10px]">
                    {uri}
                  </span>
                  <button
                    type="button"
                    aria-label={`Quitar ${uri}`}
                    className="rounded-full p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                    onClick={() =>
                      removeUri(postLogoutUris, setPostLogoutUris, i)
                    }
                  >
                    <XIcon className="size-3" />
                  </button>
                </Badge>
              ))}
              {postLogoutUris.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  Sin URIs registradas
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://miapp.com/logout"
                className="h-9"
                value={postLogoutDraft}
                onChange={(e) => setPostLogoutDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addUri(
                      postLogoutUris,
                      setPostLogoutUris,
                      postLogoutDraft,
                      setPostLogoutDraft,
                    );
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() =>
                  addUri(
                    postLogoutUris,
                    setPostLogoutUris,
                    postLogoutDraft,
                    setPostLogoutDraft,
                  )
                }
              >
                <Link2Icon data-icon="inline-start" />
                Agregar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RESOURCES (RFC 8707) */}
      <ClientResourcesCard clientId={client.client_id} />

      {/* SETTINGS */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
          <CardDescription>Scopes, grants y tipo del cliente.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field orientation="vertical">
            <FieldLabel>Scopes</FieldLabel>
            <Input
              value={scope}
              onChange={(e) => {
                setScope(e.target.value);
                setSettingsDirty(true);
              }}
              className="h-9 font-mono text-xs"
              placeholder="openid profile email offline_access"
            />
            <FieldDescription>Scopes separados por espacio.</FieldDescription>
          </Field>

          <Field orientation="vertical">
            <FieldLabel>Grant types</FieldLabel>
            <div className="flex flex-col gap-2">
              {grantOptions.map((grant) => (
                <label
                  key={grant}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={grantTypes.includes(grant)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...grantTypes, grant]
                        : grantTypes.filter((g) => g !== grant);
                      setGrantTypes(next);
                      setSettingsDirty(true);
                    }}
                  />
                  <span className="font-mono text-xs">{grant}</span>
                </label>
              ))}
            </div>
          </Field>

          <Field orientation="vertical">
            <FieldLabel>Tipo</FieldLabel>
            <select
              value={applicationType}
              onChange={(e) => {
                setApplicationType(e.target.value as "web" | "native");
                setSettingsDirty(true);
              }}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="web">web</option>
              <option value="native">native</option>
            </select>
          </Field>

          {settingsDirty && (
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={saveSettings}
                disabled={updateMutation.isMutating}
              >
                <CheckIcon data-icon="inline-start" />
                Guardar cambios
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DANGER ZONE */}
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Zona de peligro</CardTitle>
          <CardDescription>
            Acciones irreversibles sobre este cliente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {trusted ? (
            <p className="text-muted-foreground text-sm">
              Cliente first-party (trusted) — no se puede deshabilitar ni
              eliminar desde el dashboard. Gestionado vía{" "}
              <code className="bg-muted rounded px-1 font-mono text-xs">
                BETTER_AUTH_OAUTH_TRUSTED_CLIENTS
              </code>
              .
            </p>
          ) : (
            <>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button variant="outline">
                      <PowerIcon data-icon="inline-start" />
                      {client.disabled
                        ? "Habilitar cliente"
                        : "Deshabilitar cliente"}
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {client.disabled
                        ? "Habilitar cliente?"
                        : "Deshabilitar cliente?"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {client.disabled
                        ? "El cliente volverá a poder emitir autorizaciones y tokens."
                        : "El cliente dejará de emitir autorizaciones y tokens de inmediato. Las aplicaciones que lo usan recibirán invalid_client."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleToggleDisabled}>
                      {isDisabling
                        ? "Aplicando..."
                        : client.disabled
                          ? "Habilitar"
                          : "Deshabilitar"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button variant="destructive">
                      <Trash2Icon data-icon="inline-start" />
                      Eliminar cliente
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar cliente?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Todos los tokens
                      emitidos para este cliente quedarán inválidos de
                      inmediato.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      {deleteMutation.isMutating ? "Eliminando..." : "Eliminar"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function OAuthClientDetailPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;

  const { data: client, isLoading, mutate } = useGetOAuthClientQuery(clientId);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/administration/oauth">
              OAuth Apps
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {client?.client_name || clientId?.slice(0, 12) || "Detalle"}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {isLoading || !client ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      ) : (
        <ClientDetailForm
          key={client.client_id}
          client={client}
          onMutate={mutate}
        />
      )}
    </div>
  );
}
