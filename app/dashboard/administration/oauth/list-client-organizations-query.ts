import useSWR from "swr";

export interface ClientOrganization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  linked: boolean;
}

export const clientOrganizationsKey = (clientId: string) =>
  `/api/admin/clients/${encodeURIComponent(clientId)}/organizations`;

const fetcher = async (key: string) => {
  const res = await fetch(key);
  if (!res.ok) {
    const { error } = (await res.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(error ?? `Failed to fetch client organizations (${res.status})`);
  }
  return res.json();
};

/** Todas las organizaciones, con `linked` si la app puede usarse en ella. */
export const useListClientOrganizationsQuery = (clientId: string | undefined) => {
  return useSWR<ClientOrganization[], Error>(
    clientId ? clientOrganizationsKey(clientId) : null,
    fetcher,
    { revalidateOnFocus: false },
  );
};
