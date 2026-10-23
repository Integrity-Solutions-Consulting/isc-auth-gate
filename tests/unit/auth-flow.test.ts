import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { testAuth } from "@/lib/auth.test";
import { cleanupTestDb, testDb } from "@/tests/database";
import { TestHelpers } from "better-auth/plugins";

describe("Session Management", () => {
  let testHelpers: TestHelpers;

  beforeEach(async () => {
    testHelpers = (await testAuth.$context).test;
    // await cleanupTestDb();
  });

  afterEach(async () => {
    // await cleanupTestDb();
  });

  describe("createUser with password", () => {
    it("should create user with password field", async () => {
      const user = testHelpers.createUser({
        email: "password@example.com",
        name: "Password User",
        password: "securepassword123",
      });

      expect(user).toBeDefined();
      expect(user.email).toBe("password@example.com");
    });

    it("should persist user with password to database", async () => {
      const user = testHelpers.createUser({
        email: "persistpwd@example.com",
        name: "Persist PWD User",
        password: "testpass123",
      });

      const saved = await testHelpers.saveUser(user);

      expect(saved).toBeDefined();
      expect(saved.id).toBe(user.id);
    });
  });

  describe("deleteUser cleanup", () => {
    it("should delete user and related records", async () => {
      const user = testHelpers.createUser({
        email: "cleanup@example.com",
        name: "Cleanup User",
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
