import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { testAuth } from "@/lib/auth.test";
import { cleanupTestDb, testDb } from "@/tests/database";

describe("Dynamic Access Control (organization roles)", () => {
  let ctx: Awaited<typeof testAuth.$context>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let testHelpers: any;

  beforeEach(async () => {
    ctx = await testAuth.$context;
    testHelpers = ctx.test;
    await cleanupTestDb();
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  it("should create a dynamic role and persist it to the database", async () => {
    const user = testHelpers.createUser({
      email: "dac-test@example.com",
      name: "DAC Test",
    });
    await testHelpers.saveUser(user);

    const org = testHelpers.createOrganization({
      name: "DAC Corp",
      slug: "dac-corp",
    });
    await testHelpers.saveOrganization(org);

    await testHelpers.addMember({
      userId: user.id,
      organizationId: org.id,
      role: "owner",
    });

    const membersInDb = await testDb.query.members.findMany({
      where: { organizationId: org.id },
    });
    expect(membersInDb).toHaveLength(1);
    expect(membersInDb[0].userId).toBe(user.id);
    expect(membersInDb[0].role).toBe("owner");

    const { headers } = await testHelpers.login({ userId: user.id });

    const result = await testAuth.api.createOrgRole({
      headers,
      body: {
        organizationId: org.id,
        role: "editor",
        permission: {
          organization: ["update"],
          member: ["create"],
        },
      },
    });

    expect(result.success).toBe(true);
    expect(result.roleData.role).toBe("editor");

    const rolesInDb = await testDb.query.organizationRoles.findMany({
      where: { organizationId: org.id },
    });

    expect(rolesInDb).toHaveLength(1);
    expect(rolesInDb[0].role).toBe("editor");

    const parsed = JSON.parse(rolesInDb[0].permission);
    expect(parsed.organization).toContain("update");
    expect(parsed.member).toContain("create");
  });

  it("should fail when non-member tries to create a role", async () => {
    const owner = testHelpers.createUser({
      email: "owner@example.com",
      name: "Owner",
    });
    await testHelpers.saveUser(owner);

    const outsider = testHelpers.createUser({
      email: "outsider@example.com",
      name: "Outsider",
    });
    await testHelpers.saveUser(outsider);

    const org = testHelpers.createOrganization({
      name: "NoMember Corp",
      slug: "nomember-corp",
    });
    await testHelpers.saveOrganization(org);

    await testHelpers.addMember({
      userId: owner.id,
      organizationId: org.id,
      role: "owner",
    });

    const { headers } = await testHelpers.login({ userId: outsider.id });

    let error: unknown;
    try {
      await testAuth.api.createOrgRole({
        headers,
        body: {
          organizationId: org.id,
          role: "hacker",
          permission: { project: ["delete"] },
        },
      });
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
  });

  it("should delete an existing dynamic role", async () => {
    const user = testHelpers.createUser({
      email: "del-test@example.com",
      name: "Del Test",
    });
    await testHelpers.saveUser(user);

    const org = testHelpers.createOrganization({
      name: "Del Corp",
      slug: "del-corp",
    });
    await testHelpers.saveOrganization(org);

    await testHelpers.addMember({
      userId: user.id,
      organizationId: org.id,
      role: "owner",
    });

    const { headers } = await testHelpers.login({ userId: user.id });

    await testAuth.api.createOrgRole({
      headers,
      body: {
        organizationId: org.id,
        role: "viewer",
        permission: { organization: ["update"] },
      },
    });

    const before = await testDb.query.organizationRoles.findMany({
      where: { organizationId: org.id },
    });
    expect(before).toHaveLength(1);

    await testAuth.api.deleteOrgRole({
      headers,
      body: {
        organizationId: org.id,
        roleName: "viewer",
      },
    });

    const after = await testDb.query.organizationRoles.findMany({
      where: { organizationId: org.id },
    });
    expect(after).toHaveLength(0);
  });
});
