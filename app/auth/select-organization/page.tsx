import type { Metadata } from "next";
import { headers as NextHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { betterAuthServer as auth } from "@/lib/auth/server";
import { drizzlePostgreClient as db } from "@/database/clients/postgre";
import { oauthClients } from "@/database/schema";
import { listAllowedOrganizations } from "@/lib/oauth-organizations";
import { SelectOrganizationForm } from "./select-organization-form";

export const metadata: Metadata = {
  title: "Elegir organización - ISC Auth",
  description: "Elige con qué organización entrar a la aplicación",
};

// Depende de la sesión y de la query firmada del authorize.
export const dynamic = "force-dynamic";

/**
 * Página postLogin del oauthProvider: la app pidió el scope `organization` y
 * la organización activa del usuario no está vinculada a ella (o no hay). El
 * usuario elige una de las organizaciones que comparte con la app; la
 * validación real ocurre de nuevo en el servidor (consentReferenceId y claims).
 */
export default async function SelectOrganizationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) =>
      Array.isArray(value)
        ? value.map((v) => [key, v])
        : value === undefined
          ? []
          : [[key, value]],
    ),
  );

  const session = await auth.api.getSession({ headers: await NextHeaders() });
  if (!session) {
    redirect(
      `/auth/sign-in?redirectTo=${encodeURIComponent(`/auth/select-organization?${query}`)}`,
    );
  }

  const clientId = query.get("client_id") ?? "";
  const [organizations, [client]] = await Promise.all([
    clientId ? listAllowedOrganizations(session.user.id, clientId) : [],
    clientId
      ? db
          .select({ name: oauthClients.name })
          .from(oauthClients)
          .where(eq(oauthClients.clientId, clientId))
          .limit(1)
      : [],
  ]);

  return (
    <SelectOrganizationForm
      oauthQuery={query.toString()}
      clientName={client?.name ?? null}
      organizations={organizations}
    />
  );
}
