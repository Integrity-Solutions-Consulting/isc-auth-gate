import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

/**
 * RBAC statements.
 *
 * Extends Better Auth defaultStatements with project, org-native, and oauth.
 * Used across adminPlugin (static roles) and organization plugin (dynamic roles).
 *
 * org-native statements (organization, member, invitation, team, ac) are
 * required by organization plugin's dynamicAccessControl for per-org role creation.
 *
 * To add a new permission: add statement here → assign to role below → done.
 *
 * Permisos de aplicaciones OAuth: cada app conectada al gate declara aquí sus
 * recursos (p. ej. `todo` para isc-tmr) y los lista en `appResources`. Los
 * roles de organización (estáticos o creados con DAC) los asignan, y viajan
 * en el access token como `permissions: ["todo:read", ...]` cuando la app
 * pide el scope `organization`. Los recursos de gestión del gate
 * (organization, member, ac, ...) nunca salen en tokens.
 * @see https://www.better-auth.com/docs/plugins/access
 */
const statement = {
  ...defaultStatements,
  auth: ["create", "read", "update", "delete", "access"],
  project: ["create", "read", "update", "delete"],
  // ponytail: org-native statements required by DAC for per-org role creation
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: ["create", "update", "delete"],
  ac: ["create", "read", "update", "delete"],
  oauth: ["create", "read", "update", "delete"],
  // --- recursos de aplicaciones OAuth (ver appResources) ---
  // isc-tmr (app de referencia)
  todo: ["read", "create", "update", "delete"],
  // isc-tmr: módulo de RRHH (`access` = entrar al módulo)
  hr: ["access", "read", "create", "update", "delete"],
} as const;

/** Recursos cuyos permisos se emiten en los access tokens de las apps. */
export const appResources = ["todo", "hr"] as const satisfies readonly (keyof typeof statement)[];

export const accessControl = createAccessControl(statement);

/**
 * Aplana statements a `recurso:acción`, sólo de los recursos de apps
 * (appResources): los de gestión del gate (member, ac, ...) no salen en
 * tokens. Ordenado y sin duplicados para que los tokens sean estables.
 */
export function flattenAppPermissions(
  statementsList: Record<string, readonly string[]>[],
): string[] {
  const allowed = new Set<string>(appResources);
  const out = new Set<string>();
  for (const statements of statementsList) {
    for (const [resource, actions] of Object.entries(statements)) {
      if (!allowed.has(resource)) continue;
      for (const action of actions) out.add(`${resource}:${action}`);
    }
  }
  return [...out].sort();
}

export const user = accessControl.newRole({
  project: ["create"],
});

export const moderator = accessControl.newRole({
  project: ["create", "update", "read"],
  user: ["ban"],
});

export const admin = accessControl.newRole({
  project: ["create", "update"],
  auth: ["create", "read", "update", "delete", "access"],
  ...adminAc.statements,
});

export const orgSystemAdmin = accessControl.newRole({
  ...adminAc.statements,
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: ["create", "update", "delete"],
  ac: ["create", "read", "update", "delete"],
  auth: ["create", "read", "update", "delete", "access"],
  project: ["create", "read", "update", "delete"],
  todo: ["read", "create", "update", "delete"],
  hr: ["access", "read", "create", "update", "delete"],
});

// Roles org por defecto (mirror de better-auth/plugins organization access
// statement.mjs). Necesarios explícitos: hasPermission del plugin usa
// `options.roles || defaultRoles` sin merge — si pasamos `roles` parcial,
// owner/admin/member desaparecen del acceso.
export const orgOwner = accessControl.newRole({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: ["create", "update", "delete"],
  ac: ["create", "read", "update", "delete"],
  todo: ["read", "create", "update", "delete"],
  hr: ["access", "read", "create", "update", "delete"],
});

export const orgAdmin = accessControl.newRole({
  organization: ["update"],
  invitation: ["create", "cancel"],
  member: ["create", "update", "delete"],
  team: ["create", "update", "delete"],
  ac: ["create", "read", "update", "delete"],
  todo: ["read", "create", "update", "delete"],
  hr: ["access", "read", "create", "update", "delete"],
});

export const orgMember = accessControl.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: ["read"],
  todo: ["read"],
});

export const orgRoles = {
  owner: orgOwner,
  admin: orgAdmin,
  member: orgMember,
  systemAdmin: orgSystemAdmin,
} as const;
