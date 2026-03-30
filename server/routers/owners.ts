import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { owners } from "../../drizzle/schema";
import { eq, like, or, desc } from "drizzle-orm";

export const ownersRouter = router({
  list: protectedProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      if (input?.search) {
        const term = `%${input.search}%`;
        return db
          .select()
          .from(owners)
          .where(or(like(owners.name, term), like(owners.phone, term), like(owners.email, term)))
          .orderBy(desc(owners.createdAt));
      }
      return db.select().from(owners).orderBy(desc(owners.createdAt));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const result = await db.select().from(owners).where(eq(owners.id, input.id)).limit(1);
      return result[0] ?? null;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        address: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const [result] = await db.insert(owners).values({
        name: input.name,
        phone: input.phone ?? null,
        email: input.email || null,
        address: input.address ?? null,
        notes: input.notes ?? null,
      });
      return { id: result.insertId };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        address: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const { id, ...data } = input;
      await db
        .update(owners)
        .set({ ...data, email: data.email || null })
        .where(eq(owners.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      await db.delete(owners).where(eq(owners.id, input.id));
      return { success: true };
    }),
});
