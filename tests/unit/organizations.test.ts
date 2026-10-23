import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { testAuth } from "@/lib/auth.test";
import { cleanupTestDb, testDb } from "@/tests/database";
import { eq, and } from "drizzle-orm";
import { organizations, members } from "@/database/schema-sqlite";

describe("Organization Management", () => {
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

  describe("createOrganization", () => {
    it("should create organization object", () => {
      const org = testHelpers.createOrganization({
        name: "Test Corp",
        slug: "test-corp",
      });

      expect(org).toBeDefined();
      expect(org.name).toBe("Test Corp");
      expect(org.slug).toBe("test-corp");
    });

    it("should generate unique slug", () => {
      const org1 = testHelpers.createOrganization({
        name: "Org One",
        slug: "org-one",
      });
      const org2 = testHelpers.createOrganization({
        name: "Org Two",
        slug: "org-one",
      });

      expect(org1.id).not.toBe(org2.id);
    });

    it("should allow optional logo", () => {
      const org = testHelpers.createOrganization({
        name: "Logo Corp",
        slug: "logo-corp",
        logo: "https://example.com/logo.png",
      });

      expect(org.logo).toBe("https://example.com/logo.png");
    });
  });

  describe("saveOrganization", () => {
    it("should persist organization to database", async () => {
      const org = testHelpers.createOrganization({
        name: "Persist Corp",
        slug: "persist-corp",
      });

      const saved = await testHelpers.saveOrganization(org);

      expect(saved).toBeDefined();
      expect(saved.id).toBe(org.id);
    });

    it("should have createdAt timestamp", async () => {
      const org = testHelpers.createOrganization({
        name: "Timestamp Corp",
        slug: "timestamp-corp",
      });

      const saved = await testHelpers.saveOrganization(org);

      expect(saved.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("addMember", () => {
    it("should add user as member of organization", async () => {
      const user = testHelpers.createUser({
        email: "member@example.com",
        name: "Member User",
      });
      await testHelpers.saveUser(user);

      const org = testHelpers.createOrganization({
        name: "Member Corp",
        slug: "member-corp",
      });
      await testHelpers.saveOrganization(org);

      const member = await testHelpers.addMember({
        userId: user.id,
        organizationId: org.id,
        role: "admin",
      });

      expect(member).toBeDefined();
      expect(member.userId).toBe(user.id);
      expect(member.organizationId).toBe(org.id);
      expect(member.role).toBe("admin");
    });

    it("should add member with default role", async () => {
      const user = testHelpers.createUser({
        email: "defaultrole@example.com",
        name: "DefaultRole User",
      });
      await testHelpers.saveUser(user);

      const org = testHelpers.createOrganization({
        name: "DefaultRole Corp",
        slug: "defaultrole-corp",
      });
      await testHelpers.saveOrganization(org);

      const member = await testHelpers.addMember({
        userId: user.id,
        organizationId: org.id,
      });

      expect(member.role).toBe("member");
    });
  });

  describe("deleteOrganization", () => {
    it("should remove organization from database", async () => {
      const org = testHelpers.createOrganization({
        name: "Delete Corp",
        slug: "delete-corp",
      });
      await testHelpers.saveOrganization(org);

      await testHelpers.deleteOrganization(org.id);

      const orgs = await testDb.query.organizations.findMany({
        where: { id: org.id },
      });

      expect(orgs).toHaveLength(0);
    });

    it("should clean up members on organization delete", async () => {
      const user = testHelpers.createUser({
        email: "membercleanup@example.com",
        name: "MemberCleanup User",
      });
      await testHelpers.saveUser(user);

      const org = testHelpers.createOrganization({
        name: "MemberCleanup Corp",
        slug: "membercleanup-corp",
      });
      await testHelpers.saveOrganization(org);

      await testHelpers.addMember({
        userId: user.id,
        organizationId: org.id,
        role: "admin",
      });

      await testHelpers.deleteOrganization(org.id);

      const memberRecords = await testDb.query.members.findMany({
        where: { organizationId: org.id },
      });

      expect(memberRecords).toHaveLength(0);
    });
  });

  describe("deleteUser cleans up members", () => {
    it("should remove user membership on user delete", async () => {
      const user = testHelpers.createUser({
        email: "userdelmember@example.com",
        name: "UserDelMember",
      });
      await testHelpers.saveUser(user);

      const org = testHelpers.createOrganization({
        name: "UserDelMember Corp",
        slug: "userdelmember-corp",
      });
      await testHelpers.saveOrganization(org);

      await testHelpers.addMember({
        userId: user.id,
        organizationId: org.id,
        role: "admin",
      });

      await testHelpers.deleteUser(user.id);

      const memberRecords = await testDb.query.members.findMany({
        where: { userId: user.id },
      });

      expect(memberRecords).toHaveLength(0);
    });
  });
});
