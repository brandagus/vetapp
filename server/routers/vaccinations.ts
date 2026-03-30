import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { vaccinations, pets } from "../../drizzle/schema";
import { eq, desc, and, lte, gte, sql } from "drizzle-orm";

export const vaccinationsRouter = router({
  // List vaccinations for a pet
  listByPet: protectedProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      return db
        .select()
        .from(vaccinations)
        .where(eq(vaccinations.petId, input.petId))
        .orderBy(desc(vaccinations.applicationDate));
    }),

  // Get upcoming/overdue vaccines across all pets (for dashboard alerts)
  getAlerts: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const today = new Date().toISOString().split("T")[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Overdue vaccines
    const overdue = await db
      .select({
        id: vaccinations.id,
        petId: vaccinations.petId,
        petName: pets.name,
        petSpecies: pets.species,
        vaccineName: vaccinations.vaccineName,
        nextDoseDate: vaccinations.nextDoseDate,
        status: vaccinations.status,
      })
      .from(vaccinations)
      .leftJoin(pets, eq(vaccinations.petId, pets.id))
      .where(
        and(
          lte(vaccinations.nextDoseDate, new Date(today)),
          eq(vaccinations.status, "aplicada")
        )
      )
      .orderBy(vaccinations.nextDoseDate);

    // Upcoming (next 7 days)
    const upcoming = await db
      .select({
        id: vaccinations.id,
        petId: vaccinations.petId,
        petName: pets.name,
        petSpecies: pets.species,
        vaccineName: vaccinations.vaccineName,
        nextDoseDate: vaccinations.nextDoseDate,
        status: vaccinations.status,
      })
      .from(vaccinations)
      .leftJoin(pets, eq(vaccinations.petId, pets.id))
      .where(
        and(
          gte(vaccinations.nextDoseDate, new Date(today)),
          lte(vaccinations.nextDoseDate, new Date(nextWeek)),
          eq(vaccinations.status, "aplicada")
        )
      )
      .orderBy(vaccinations.nextDoseDate);

    return { overdue, upcoming };
  }),

  create: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        vaccineName: z.string().min(1),
        laboratory: z.string().optional(),
        lotNumber: z.string().optional(),
        doseNumber: z.string().optional(),
        applicationDate: z.string().min(1),
        nextDoseDate: z.string().optional(),
        status: z.enum(["aplicada", "programada", "vencida"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const [result] = await db.insert(vaccinations).values({
        petId: input.petId,
        vaccineName: input.vaccineName,
        laboratory: input.laboratory ?? null,
        lotNumber: input.lotNumber ?? null,
        doseNumber: input.doseNumber ?? null,
        applicationDate: new Date(input.applicationDate),
        nextDoseDate: input.nextDoseDate ? new Date(input.nextDoseDate) : null,
        status: input.status ?? "aplicada",
        notes: input.notes ?? null,
      });
      return { id: result.insertId };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        vaccineName: z.string().optional(),
        laboratory: z.string().optional(),
        lotNumber: z.string().optional(),
        doseNumber: z.string().optional(),
        applicationDate: z.string().optional(),
        nextDoseDate: z.string().optional(),
        status: z.enum(["aplicada", "programada", "vencida"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const { id, applicationDate, nextDoseDate, ...rest } = input;
      await db
        .update(vaccinations)
        .set({
          ...rest,
          applicationDate: applicationDate ? new Date(applicationDate) : undefined,
          nextDoseDate: nextDoseDate ? new Date(nextDoseDate) : undefined,
        })
        .where(eq(vaccinations.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      await db.delete(vaccinations).where(eq(vaccinations.id, input.id));
      return { success: true };
    }),
});
