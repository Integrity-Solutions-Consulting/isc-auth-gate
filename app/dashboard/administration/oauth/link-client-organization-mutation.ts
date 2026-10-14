import { BetterFetchError } from "better-auth/client";
import useSWRMutation from "swr/mutation";
import { clientOrganizationsKey } from "./list-client-organizations-query";

export interface LinkClientOrganizationArg {
  clientId: string;
  organizationId: string;
  /** true vincula (POST), false desvincula (DELETE). */
  linked: boolean;
}

const key = "POST|DELETE /api/admin/clients/:clientId/organizations/:organizationId";

const fetcher = async (
  _key: string,
  { arg }: { arg: LinkClientOrganizationArg },
) => {
  const res = await fetch(
    `${clientOrganizationsKey(arg.clientId)}/${encodeURIComponent(arg.organizationId)}`,
    { method: arg.linked ? "POST" : "DELETE" },
  );
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      (data as { error?: string })?.error ??
        `Failed to ${arg.linked ? "link" : "unlink"} organization (${res.status})`,
    );
  }
  return data;
};

export const useLinkClientOrganizationMutation = () => {
  return useSWRMutation<
    unknown,
    BetterFetchError,
    typeof key,
    LinkClientOrganizationArg
  >(key, fetcher);
};
