import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { payments, owners, visits, pets } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sum, count } from "drizzle-orm";

export const paymentsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pagado", "pendiente", "parcial"]).optional(),
        ownerId: z.number().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().default(50),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");

      const conditions = [];
      if (input?.status) conditions.push(eq(payments.status, input.status));
      if (input?.ownerId) conditions.push(eq(payments.ownerId, input.ownerId));
      if (input?.from) conditions.push(gte(payments.createdAt, new Date(input.from)));
      if (input?.to) conditions.push(lte(payments.createdAt, new Date(input.to)));

      const query = db
        .select({
          id: payments.id,
          amount: payments.amount,
          currency: payments.currency,
          method: payments.method,
          status: payments.status,
          paidAt: payments.paidAt,
          description: payments.description,
          notes: payments.notes,
          visitId: payments.visitId,
          appointmentId: payments.appointmentId,
          ownerId: payments.ownerId,
          createdAt: payments.createdAt,
          ownerName: owners.name,
          ownerPhone: owners.phone,
        })
        .from(payments)
        .leftJoin(owners, eq(payments.ownerId, owners.id))
        .orderBy(desc(payments.createdAt))
        .limit(input?.limit ?? 50);

      if (conditions.length > 0) {
        return query.where(and(...conditions));
      }
      return query;
    }),

  getPending: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    return db
      .select({
        id: payments.id,
        amount: payments.amount,
        currency: payments.currency,
        method: payments.method,
        status: payments.status,
        description: payments.description,
        createdAt: payments.createdAt,
        ownerId: payments.ownerId,
        ownerName: owners.name,
        ownerPhone: owners.phone,
      })
      .from(payments)
      .leftJoin(owners, eq(payments.ownerId, owners.id))
      .where(eq(payments.status, "pendiente"))
      .orderBy(desc(payments.createdAt));
  }),

  getSummary: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalPaid] = await db
      .select({ total: sum(payments.amount), qty: count() })
      .from(payments)
      .where(and(eq(payments.status, "pagado"), gte(payments.createdAt, startOfMonth)));

    const [totalPending] = await db
      .select({ total: sum(payments.amount), qty: count() })
      .from(payments)
      .where(eq(payments.status, "pendiente"));

    return {
      monthPaid: totalPaid?.total ?? "0",
      monthPaidCount: totalPaid?.qty ?? 0,
      pendingTotal: totalPending?.total ?? "0",
      pendingCount: totalPending?.qty ?? 0,
    };
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const result = await db.select().from(payments).where(eq(payments.id, input.id)).limit(1);
      return result[0] ?? null;
    }),

  create: protectedProcedure
    .input(
      z.object({
        ownerId: z.number(),
        visitId: z.number().optional(),
        appointmentId: z.number().optional(),
        amount: z.string(),
        method: z.enum(["efectivo", "transferencia", "otro"]),
        status: z.enum(["pagado", "pendiente", "parcial"]).default("pendiente"),
        description: z.string().optional(),
        notes: z.string().optional(),
        paidAt: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const [result] = await db.insert(payments).values({
        ownerId: input.ownerId,
        visitId: input.visitId ?? null,
        appointmentId: input.appointmentId ?? null,
        amount: input.amount,
        method: input.method,
        status: input.status,
        description: input.description ?? null,
        notes: input.notes ?? null,
        paidAt: input.paidAt ? new Date(input.paidAt) : (input.status === "pagado" ? new Date() : null),
      });
      return { id: result.insertId };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        amount: z.string().optional(),
        method: z.enum(["efectivo", "transferencia", "otro"]).optional(),
        status: z.enum(["pagado", "pendiente", "parcial"]).optional(),
        description: z.string().optional(),
        notes: z.string().optional(),
        paidAt: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const { id, paidAt, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest };
      if (paidAt) updateData.paidAt = new Date(paidAt);
      if (rest.status === "pagado" && !paidAt) updateData.paidAt = new Date();
      await db.update(payments).set(updateData).where(eq(payments.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      await db.delete(payments).where(eq(payments.id, input.id));
      return { success: true };
    }),
});
