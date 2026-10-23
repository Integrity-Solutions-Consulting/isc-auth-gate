"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OAuthResource } from "@better-auth/oauth-provider";
import { ColumnDef } from "@tanstack/react-table";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { DeleteResourceDialog } from "./delete-resource-dialog";
import { UpdateResourceDialog } from "./update-resource-dialog";

const StatusCell = ({ resource }: { resource: OAuthResource }) => (
  <div className="flex flex-wrap items-center gap-1.5">
    {resource.disabled ? (
      <Badge variant="destructive" className="text-[10px]">
        Disabled
      </Badge>
    ) : (
      <Badge variant="secondary" className="text-[10px]">
        Active
      </Badge>
    )}
    {resource.dpopBoundAccessTokensRequired && (
      <Badge variant="outline" className="text-[10px]">
        DPoP
      </Badge>
    )}
  </div>
);

// ponytail: los diálogos van fuera de un DropdownMenu (como en la tabla de
// clients). En Base UI el Menu.Item es un <div> — el trigger exige <button>
// (nativeButton) — y al hacer click cierra el menú y desmonta el diálogo.
const ActionsCell = ({ resource }: { resource: OAuthResource }) => (
  <div className="flex justify-end gap-1">
    <UpdateResourceDialog resource={resource}>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Edit resource"
        title="Edit resource"
      >
        <PencilIcon />
      </Button>
    </UpdateResourceDialog>
    <DeleteResourceDialog resource={resource}>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Delete resource"
        title="Delete resource"
      >
        <Trash2Icon />
      </Button>
    </DeleteResourceDialog>
  </div>
);

export const AuthResourcesTableColumns: ColumnDef<OAuthResource>[] = [
  {
    accessorKey: "identifier",
    header: "Identifier",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.identifier}</span>
    ),
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => row.original.name ?? "—",
  },
  {
    accessorKey: "allowedScopes",
    header: "Allowed Scopes",
    cell: ({ row }) =>
      row.original.allowedScopes?.length ? (
        <div className="flex flex-wrap gap-1">
          {row.original.allowedScopes.map((s) => (
            <Badge key={s} variant="outline" className="font-mono text-[10px]">
              {s}
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      ),
  },
  {
    accessorKey: "accessTokenTtl",
    header: "Access TTL (s)",
    cell: ({ row }) => row.original.accessTokenTtl ?? "default",
  },
  {
    accessorKey: "refreshTokenTtl",
    header: "Refresh TTL (s)",
    cell: ({ row }) => row.original.refreshTokenTtl ?? "default",
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <StatusCell resource={row.original} />,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <ActionsCell resource={row.original} />,
  },
];