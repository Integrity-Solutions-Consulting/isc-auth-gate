import { BetterFetchError } from "better-auth/client";
import useSWRMutation from "swr/mutation";
import { resourcesKey } from "./list-resources-query";

export interface LinkClientResourceArg {
  identifier: string;
  clientId: string;
  /** true vincula (POST), false desvincula (DELETE). */
  linked: boolean;
}

const key = "POST|DELETE /api/admin/resources/:identifier/clients/:clientId";

const fetcher = async (
  _key: string,
  { arg }: { arg: LinkClientResourceArg },
) => {
  const res = await fetch(
    `${resourcesKey}/${encodeURIComponent(arg.identifier)}/clients/${encodeURIComponent(arg.clientId)}`,
    { method: arg.linked ? "POST" : "DELETE" },
  );
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      (data as { error?: string })?.error ??
        `Failed to ${arg.linked ? "link" : "unlink"} resource (${res.status})`,
    );
  }
  return data;
};

export const useLinkClientResourceMutation = () => {
  return useSWRMutation<
    unknown,
    BetterFetchError,
    typeof key,
    LinkClientResourceArg
  >(key, fetcher);
};
