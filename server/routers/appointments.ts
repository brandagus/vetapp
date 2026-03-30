import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { appointments, pets, owners } from "../../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export const appointmentsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        from: z.string().optional(), // ISO date
        to: z.string().optional(),
        status: z.enum(["pendiente", "confirmado", "completado", "cancelado"]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");

      const conditions = [];
      if (input?.from) conditions.push(gte(appointments.startTime, new Date(input.from)));
      if (input?.to) conditions.push(lte(appointments.startTime, new Date(input.to)));
      if (input?.status) conditions.push(eq(appointments.status, input.status));

      const query = db
        .select({
          id: appointments.id,
          startTime: appointments.startTime,
          endTime: appointments.endTime,
          status: appointments.status,
          reason: appointments.reason,
          address: appointments.address,
          notes: appointments.notes,
          petId: appointments.petId,
          ownerId: appointments.ownerId,
          clientName: appointments.clientName,
          clientPhone: appointments.clientPhone,
          clientEmail: appointments.clientEmail,
          petName: appointments.petName,
          petSpecies: appointments.petSpecies,
          visitId: appointments.visitId,
          createdAt: appointments.createdAt,
          // Joined fields
          ownerName: owners.name,
          ownerPhone: owners.phone,
          linkedPetName: pets.name,
        })
        .from(appointments)
        .leftJoin(owners, eq(appointments.ownerId, owners.id))
        .leftJoin(pets, eq(appointments.petId, pets.id))
        .orderBy(desc(appointments.startTime));

      if (conditions.length > 0) {
        return query.where(and(...conditions));
      }
      return query;
    }),

  getToday: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    return db
      .select({
        id: appointments.id,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
        reason: appointments.reason,
        address: appointments.address,
        clientName: appointments.clientName,
        petName: appointments.petName,
        petSpecies: appointments.petSpecies,
        ownerId: appointments.ownerId,
        petId: appointments.petId,
        ownerName: owners.name,
        ownerPhone: owners.phone,
        linkedPetName: pets.name,
      })
      .from(appointments)
      .leftJoin(owners, eq(appointments.ownerId, owners.id))
      .leftJoin(pets, eq(appointments.petId, pets.id))
      .where(
        and(
          gte(appointments.startTime, startOfDay),
          lte(appointments.startTime, endOfDay)
        )
      )
      .orderBy(appointments.startTime);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const result = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, input.id))
        .limit(1);
      return result[0] ?? null;
    }),

  create: protectedProcedure
    .input(
      z.object({
        petId: z.number().optional(),
        ownerId: z.number().optional(),
        clientName: z.string().optional(),
        clientPhone: z.string().optional(),
        clientEmail: z.string().optional(),
        petName: z.string().optional(),
        petSpecies: z.string().optional(),
        startTime: z.string(),
        endTime: z.string(),
        reason: z.string().optional(),
        address: z.string().optional(),
        status: z.enum(["pendiente", "confirmado", "completado", "cancelado"]).default("pendiente"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const [result] = await db.insert(appointments).values({
        petId: input.petId ?? null,
        ownerId: input.ownerId ?? null,
        clientName: input.clientName ?? null,
        clientPhone: input.clientPhone ?? null,
        clientEmail: input.clientEmail ?? null,
        petName: input.petName ?? null,
        petSpecies: input.petSpecies ?? null,
        startTime: new Date(input.startTime),
        endTime: new Date(input.endTime),
        reason: input.reason ?? null,
        address: input.address ?? null,
        status: input.status,
        notes: input.notes ?? null,
      });
      return { id: result.insertId };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pendiente", "confirmado", "completado", "cancelado"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      await db
        .update(appointments)
        .set({ status: input.status, notes: input.notes })
        .where(eq(appointments.id, input.id));
      return { success: true };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        petId: z.number().optional().nullable(),
        ownerId: z.number().optional().nullable(),
        clientName: z.string().optional(),
        clientPhone: z.string().optional(),
        clientEmail: z.string().optional(),
        petName: z.string().optional(),
        petSpecies: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        reason: z.string().optional(),
        address: z.string().optional(),
        status: z.enum(["pendiente", "confirmado", "completado", "cancelado"]).optional(),
        notes: z.string().optional(),
        visitId: z.number().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const { id, startTime, endTime, ...rest } = input;
      await db
        .update(appointments)
        .set({
          ...rest,
          startTime: startTime ? new Date(startTime) : undefined,
          endTime: endTime ? new Date(endTime) : undefined,
        })
        .where(eq(appointments.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      await db.delete(appointments).where(eq(appointments.id, input.id));
      return { success: true };
    }),

  // Public endpoint for client booking requests
  requestBooking: publicProcedure
    .input(
      z.object({
        clientName: z.string().min(1),
        clientPhone: z.string().min(1),
        clientEmail: z.string().email().optional().or(z.literal("")),
        petName: z.string().min(1),
        petSpecies: z.string().min(1),
        preferredDate: z.string(),
        reason: z.string().optional(),
        address: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const startTime = new Date(input.preferredDate);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // +1 hour
      const [result] = await db.insert(appointments).values({
        clientName: input.clientName,
        clientPhone: input.clientPhone,
        clientEmail: input.clientEmail || null,
        petName: input.petName,
        petSpecies: input.petSpecies,
        startTime,
        endTime,
        reason: input.reason ?? null,
        address: input.address ?? null,
        status: "pendiente",
      });
      return { id: result.insertId };
    }),
});
