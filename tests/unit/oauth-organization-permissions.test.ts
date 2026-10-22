import { describe, expect, test } from "bun:test";
import {
  flattenAppPermissions,
  orgAdmin,
  orgMember,
  orgOwner,
} from "@/lib/permissions";

describe("flattenAppPermissions", () => {
  test("solo emite recursos de apps (no los de gestión del gate)", () => {
    expect(flattenAppPermissions([orgOwner.statements])).toEqual([
      "hr:access",
      "hr:create",
      "hr:delete",
      "hr:read",
      "hr:update",
      "todo:create",
      "todo:delete",
      "todo:read",
      "todo:update",
    ]);
  });

  test("member por defecto solo lee", () => {
    expect(flattenAppPermissions([orgMember.statements])).toEqual(["todo:read"]);
  });

  test("une roles múltiples y roles dinámicos sin duplicar, ordenado", () => {
    const dynamicEditor = { todo: ["update", "read"], member: ["create"] };
    expect(
      flattenAppPermissions([orgMember.statements, dynamicEditor]),
    ).toEqual(["todo:read", "todo:update"]);
  });

  test("admin de org tiene CRUD completo", () => {
    expect(flattenAppPermissions([orgAdmin.statements])).toHaveLength(9);
  });

  test("sin statements → sin permisos", () => {
    expect(flattenAppPermissions([])).toEqual([]);
  });
});
