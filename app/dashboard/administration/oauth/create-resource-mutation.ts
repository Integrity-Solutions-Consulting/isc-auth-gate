import { OAuthResourceInput } from "@better-auth/oauth-provider";
import { BetterFetchError } from "better-auth/client";
import useSWRMutation from "swr/mutation";
import { resourcesKey } from "./list-resources-query";

const key = "POST /admin/resources";

const fetcher = async (_key: string, { arg }: { arg: OAuthResourceInput }) => {
  const res = await fetch(resourcesKey, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(arg),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      (data as { error?: string })?.error ?? `Failed to create resource (${res.status})`,
    );
  }
  return data;
};

export const useCreateResourceMutation = () => {
  return useSWRMutation<unknown, BetterFetchError, typeof key, OAuthResourceInput>(
    key,
    fetcher,
  );
};