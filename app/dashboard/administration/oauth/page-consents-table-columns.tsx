"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OAuthConsent } from "@better-auth/oauth-provider";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ShieldCheckIcon, Trash2Icon } from "lucide-react";

import { DeleteOauthConsentDialog } from "./delete-oauth-consent-dialog";

export type ConsentRow = OAuthConsent & {
  clientName?: string;
};

const ScopesCell = ({ scopes }: { scopes: string[] }) => (
  <div className="flex flex-wrap gap-1">
    {scopes.map((scope) => (
      <Badge key={scope} variant="secondary" className="font-mono text-[10px]">
        {scope}
      </Badge>
    ))}
  </div>
);

const ActionsCell = ({ consent }: { consent: OAuthConsent }) => (
  <div className="flex justify-end">
    <DeleteOauthConsentDialog consent={consent}>
      <Button
        nativeButton={false}
        size="icon-sm"
        variant="ghost"
        aria-label="Revoke consent"
        title="Revoke consent"
      >
        <Trash2Icon />
      </Button>
    </DeleteOauthConsentDialog>
  </div>
);

export const AuthConsentsTableColumns: ColumnDef<ConsentRow>[] = [
  {
    accessorKey: "clientId",
    header: "Client",
    cell({ row }) {
      const { clientId, clientName } = row.original;

      return (
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-sm font-medium leading-none">
            <ShieldCheckIcon className="size-3.5 text-muted-foreground" />
            {clientName || clientId}
          </span>
          {clientName && (
            <span className="font-mono text-xs text-muted-foreground">
              {clientId}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "scopes",
    header: "Scopes",
    cell: ({ row }) => <ScopesCell scopes={row.original.scopes} />,
  },
  {
    accessorKey: "createdAt",
    header: "Granted",
    cell({ row }) {
      return (
        <div className="text-sm text-muted-foreground">
          {format(new Date(row.original.createdAt), "MMM d, yyyy")}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell consent={row.original} />,
  },
];
