import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { testAuth } from "@/lib/auth.test";
import { cleanupTestDb, testDb } from "@/tests/database";

describe("User Management", () => {
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

  describe("createUser", () => {
    it("should create user object with required fields", async () => {
      const user = testHelpers.createUser({
        email: "test@example.com",
        name: "Test User",
      });

      expect(user).toBeDefined();
      expect(user.email).toBe("test@example.com");
      expect(user.name).toBe("Test User");
      expect(user.id).toBeDefined();
    });

    it("should generate unique ids", async () => {
      const user1 = testHelpers.createUser({
        email: "user1@example.com",
        name: "User 1",
      });
      const user2 = testHelpers.createUser({
        email: "user2@example.com",
        name: "User 2",
      });

      expect(user1.id).not.toBe(user2.id);
    });

    it("should set default banned to false when provided", async () => {
      const user = testHelpers.createUser({
        email: "default@example.com",
        name: "Default User",
        banned: false,
      });

      expect(user.banned).toBe(false);
    });

    it("should allow custom optional fields", async () => {
      const user = testHelpers.createUser({
        email: "admin@example.com",
        name: "Admin User",
        role: "admin",
        image: "https://example.com/avatar.png",
      });

      expect(user.role).toBe("admin");
      expect(user.image).toBe("https://example.com/avatar.png");
    });

    it("should preserve email as provided", async () => {
      const user = testHelpers.createUser({
        email: "preserve@test.com",
        name: "Preserve User",
      });

      expect(user.email).toBe("preserve@test.com");
    });
  });

  describe("saveUser", () => {
    it("should persist user to database", async () => {
      const user = testHelpers.createUser({
        email: "persist@example.com",
        name: "Persist User",
      });

      const saved = await testHelpers.saveUser(user);

      expect(saved).toBeDefined();
      expect(saved.id).toBe(user.id);
    });

    it("should create user with createdAt timestamp", async () => {
      const user = testHelpers.createUser({
        email: "timestamp@example.com",
        name: "Timestamp User",
      });

      const saved = await testHelpers.saveUser(user);

      expect(saved.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("deleteUser", () => {
    it("should remove user from database", async () => {
      const user = testHelpers.createUser({
        email: "delete@example.com",
        name: "Delete User",
      });

      await testHelpers.saveUser(user);
      await testHelpers.deleteUser(user.id);

      const users = await testDb.query.users.findMany({
        where: { id: user.id },
      });

      expect(users).toHaveLength(0);
    });
  });
});
