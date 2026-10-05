import useSWR from "swr";

export const clientResourcesKey = (clientId: string) =>
  `/api/admin/clients/${encodeURIComponent(clientId)}/resources`;

const fetcher = async (key: string) => {
  const res = await fetch(key);
  if (!res.ok) {
    const { error } = (await res.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(error ?? `Failed to fetch client resources (${res.status})`);
  }
  return res.json();
};

/** Identifiers de los resources vinculados al client (oauth_client_resources). */
export const useListClientResourcesQuery = (clientId: string | undefined) => {
  return useSWR<string[], Error>(
    clientId ? clientResourcesKey(clientId) : null,
    fetcher,
    { revalidateOnFocus: false },
  );
};
