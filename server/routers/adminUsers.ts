import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq, desc, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";

export const adminUsersRouter = router({
  // List all users (excluding password hashes)
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const result = await db
      .select({
        id: users.id,
        openId: users.openId,
        name: users.name,
        email: users.email,
        loginMethod: users.loginMethod,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
    return result;
  }),

  // Get single user by ID
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const result = await db
        .select({
          id: users.id,
          openId: users.openId,
          name: users.name,
          email: users.email,
          loginMethod: users.loginMethod,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          lastSignedIn: users.lastSignedIn,
        })
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);
      return result[0] ?? null;
    }),

  // Create a new user with email/password
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "El nombre es requerido"),
        email: z.string().email("Email inválido"),
        password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
        role: z.enum(["user", "admin"]).default("user"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");

      // Check if email already exists
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ya existe un usuario con ese email",
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 12);

      // Generate a unique openId for local users
      const openId = `local_${randomUUID()}`;

      const [result] = await db.insert(users).values({
        openId,
        name: input.name,
        email: input.email,
        passwordHash,
        loginMethod: "email",
        role: input.role,
        isActive: true,
        lastSignedIn: new Date(),
      });

      return { id: result.insertId, openId };
    }),

  // Update user info (name, email, role, active status)
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        role: z.enum(["user", "admin"]).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");

      const { id, ...data } = input;

      // Prevent admin from deactivating themselves
      if (data.isActive === false && ctx.user.id === id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No podés desactivar tu propia cuenta",
        });
      }

      // Prevent admin from removing their own admin role
      if (data.role && data.role !== "admin" && ctx.user.id === id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No podés quitarte el rol de administrador",
        });
      }

      // If email is being changed, check for duplicates
      if (data.email) {
        const existing = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, data.email))
          .limit(1);

        if (existing.length > 0 && existing[0].id !== id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Ya existe un usuario con ese email",
          });
        }
      }

      await db.update(users).set(data).where(eq(users.id, id));
      return { success: true };
    }),

  // Change user password (admin can change any user's password)
  changePassword: adminProcedure
    .input(
      z.object({
        id: z.number(),
        newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");

      const passwordHash = await bcrypt.hash(input.newPassword, 12);
      await db
        .update(users)
        .set({ passwordHash })
        .where(eq(users.id, input.id));

      return { success: true };
    }),

  // Delete user (cannot delete self)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");

      if (ctx.user.id === input.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No podés eliminar tu propia cuenta",
        });
      }

      await db.delete(users).where(eq(users.id, input.id));
      return { success: true };
    }),
});
