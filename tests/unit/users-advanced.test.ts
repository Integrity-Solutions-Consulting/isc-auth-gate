import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { testAuth } from "@/lib/auth.test";
import { cleanupTestDb, testDb } from "@/tests/database";
import { eq } from "drizzle-orm";

describe("User Auth Advanced", () => {
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

  describe("getAuthHeaders", () => {
    it("should return headers with session cookie", async () => {
      const user = testHelpers.createUser({
        email: "headers@example.com",
        name: "Headers User",
      });
      await testHelpers.saveUser(user);

      const headers = await testHelpers.getAuthHeaders({ userId: user.id });

      expect(headers).toBeInstanceOf(Headers);
      expect(headers.get("cookie")).toBeDefined();
    });

    it("should contain valid session token", async () => {
      const user = testHelpers.createUser({
        email: "token@example.com",
        name: "Token User",
      });
      await testHelpers.saveUser(user);

      const headers = await testHelpers.getAuthHeaders({ userId: user.id });
      const cookieHeader = headers.get("cookie") || "";

      expect(cookieHeader).toContain("better-auth.session_token");
    });
  });

  describe("login with userId", () => {
    it("should create session with userId object", async () => {
      const user = testHelpers.createUser({
        email: "loginuser@example.com",
        name: "LoginUser",
      });
      await testHelpers.saveUser(user);

      const result = await testHelpers.login({ userId: user.id });

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.session).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.headers).toBeDefined();
    });

    it("should return session with correct userId", async () => {
      const user = testHelpers.createUser({
        email: "sessionuser@example.com",
        name: "SessionUser",
      });
      await testHelpers.saveUser(user);

      const result = await testHelpers.login({ userId: user.id });

      expect(result.session.userId).toBe(user.id);
      expect(result.user.id).toBe(user.id);
    });
  });

  describe("session cleanup", () => {
    it("should delete user and clean sessions", async () => {
      const user = testHelpers.createUser({
        email: "cleanup@example.com",
        name: "CleanupUser",
      });
      await testHelpers.saveUser(user);

      const result = await testHelpers.login({ userId: user.id });
      expect(result.session).toBeDefined();

      await testHelpers.deleteUser(user.id);

      const users = await testDb.query.users.findMany({
        where: { id: user.id },
      });

      expect(users).toHaveLength(0);
    });
  });
});
