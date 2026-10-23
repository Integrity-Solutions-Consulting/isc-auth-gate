import { OAuthResourceInput } from "@better-auth/oauth-provider";
import { BetterFetchError } from "better-auth/client";
import useSWRMutation from "swr/mutation";
import { resourcesKey } from "./list-resources-query";

export interface UpdateResourceArg {
  identifier: string;
  body: OAuthResourceInput;
}

const key = "PATCH /admin/resources/:identifier";

const fetcher = async (_key: string, { arg }: { arg: UpdateResourceArg }) => {
  const res = await fetch(
    `${resourcesKey}/${encodeURIComponent(arg.identifier)}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(arg.body),
    },
  );
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      (data as { error?: string })?.error ?? `Failed to update resource (${res.status})`,
    );
  }
  return data;
};

export const useUpdateResourceMutation = () => {
  return useSWRMutation<unknown, BetterFetchError, typeof key, UpdateResourceArg>(
    key,
    fetcher,
  );
};