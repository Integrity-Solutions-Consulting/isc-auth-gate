import { OAuthResource } from "@better-auth/oauth-provider";
import useSWR from "swr";

export const resourcesKey = "/api/admin/resources";

const fetcher = async () => {
  const res = await fetch(resourcesKey);
  if (!res.ok) {
    const { error } = (await res.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(error ?? `Failed to fetch resources (${res.status})`);
  }
  return res.json();
};

export const useListResourcesQuery = () => {
  return useSWR<OAuthResource[], Error, typeof resourcesKey>(
    resourcesKey,
    fetcher,
    {
      errorRetryCount: 3,
      errorRetryInterval: 1000,
      revalidateOnFocus: false,
    },
  );
};
