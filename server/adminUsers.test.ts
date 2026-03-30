import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    isActive: true,
    passwordHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUserContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "email",
    role: "user",
    isActive: true,
    passwordHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("adminUsers router", () => {
  describe("access control", () => {
    it("rejects non-admin users from listing users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.adminUsers.list()).rejects.toThrow();
    });

    it("rejects non-admin users from creating users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.adminUsers.create({
          name: "Test",
          email: "test@example.com",
          password: "123456",
          role: "user",
        })
      ).rejects.toThrow();
    });

    it("rejects non-admin users from changing passwords", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.adminUsers.changePassword({
          id: 1,
          newPassword: "newpass123",
        })
      ).rejects.toThrow();
    });

    it("rejects non-admin users from deleting users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.adminUsers.delete({ id: 1 })
      ).rejects.toThrow();
    });
  });

  describe("admin operations", () => {
    it("allows admin to list users", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.adminUsers.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("prevents admin from deleting themselves", async () => {
      const ctx = createAdminContext({ id: 1 });
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.adminUsers.delete({ id: 1 })
      ).rejects.toThrow("No podés eliminar tu propia cuenta");
    });

    it("prevents admin from deactivating themselves", async () => {
      const ctx = createAdminContext({ id: 1 });
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.adminUsers.update({ id: 1, isActive: false })
      ).rejects.toThrow("No podés desactivar tu propia cuenta");
    });

    it("prevents admin from removing their own admin role", async () => {
      const ctx = createAdminContext({ id: 1 });
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.adminUsers.update({ id: 1, role: "user" })
      ).rejects.toThrow("No podés quitarte el rol de administrador");
    });
  });

  describe("input validation", () => {
    it("rejects create with empty name", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.adminUsers.create({
          name: "",
          email: "test@example.com",
          password: "123456",
          role: "user",
        })
      ).rejects.toThrow();
    });

    it("rejects create with invalid email", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.adminUsers.create({
          name: "Test",
          email: "not-an-email",
          password: "123456",
          role: "user",
        })
      ).rejects.toThrow();
    });

    it("rejects create with short password", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.adminUsers.create({
          name: "Test",
          email: "test@example.com",
          password: "12345",
          role: "user",
        })
      ).rejects.toThrow();
    });

    it("rejects password change with short password", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.adminUsers.changePassword({
          id: 2,
          newPassword: "12345",
        })
      ).rejects.toThrow();
    });
  });
});
