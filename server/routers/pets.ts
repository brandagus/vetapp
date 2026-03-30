import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { pets, owners, visits, payments } from "../../drizzle/schema";
import { eq, desc, or, like, sql } from "drizzle-orm";

export const petsRouter = router({
  list: protectedProcedure
    .input(z.object({ ownerId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const query = db
        .select({
          id: pets.id,
          name: pets.name,
          species: pets.species,
          breed: pets.breed,
          birthDate: pets.birthDate,
          sex: pets.sex,
          color: pets.color,
          weight: pets.weight,
          microchip: pets.microchip,
          photoUrl: pets.photoUrl,
          notes: pets.notes,
          isActive: pets.isActive,
          ownerId: pets.ownerId,
          ownerName: owners.name,
          ownerPhone: owners.phone,
          createdAt: pets.createdAt,
          updatedAt: pets.updatedAt,
        })
        .from(pets)
        .leftJoin(owners, eq(pets.ownerId, owners.id))
        .orderBy(desc(pets.createdAt));

      if (input?.ownerId) {
        return query.where(eq(pets.ownerId, input.ownerId));
      }
      return query;
    }),

  // Smart search across pet name, owner name, and species
  search: protectedProcedure
    .input(z.object({
      query: z.string().optional(),
      species: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");

      let q = db
        .select({
          id: pets.id,
          name: pets.name,
          species: pets.species,
          breed: pets.breed,
          birthDate: pets.birthDate,
          sex: pets.sex,
          weight: pets.weight,
          photoUrl: pets.photoUrl,
          isActive: pets.isActive,
          ownerId: pets.ownerId,
          ownerName: owners.name,
          ownerPhone: owners.phone,
          ownerEmail: owners.email,
        })
        .from(pets)
        .leftJoin(owners, eq(pets.ownerId, owners.id))
        .orderBy(desc(pets.updatedAt))
        .$dynamic();

      const conditions = [];
      if (input.species) {
        conditions.push(eq(pets.species, input.species));
      }
      if (input.query && input.query.trim().length > 0) {
        const term = `%${input.query.trim()}%`;
        conditions.push(
          or(
            like(pets.name, term),
            like(owners.name, term),
            like(pets.breed, term),
          )!
        );
      }
      if (conditions.length > 0) {
        // Apply all conditions with AND
        for (const cond of conditions) {
          q = q.where(cond);
        }
      }

      return q.limit(50);
    }),

  // Rich profile with owner info, last visit, last payment
  getProfile: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");

      // Get pet + owner info
      const [pet] = await db
        .select({
          id: pets.id,
          name: pets.name,
          species: pets.species,
          breed: pets.breed,
          birthDate: pets.birthDate,
          sex: pets.sex,
          color: pets.color,
          weight: pets.weight,
          microchip: pets.microchip,
          photoUrl: pets.photoUrl,
          photoKey: pets.photoKey,
          notes: pets.notes,
          isActive: pets.isActive,
          ownerId: pets.ownerId,
          ownerName: owners.name,
          ownerPhone: owners.phone,
          ownerEmail: owners.email,
          ownerAddress: owners.address,
          ownerNotes: owners.notes,
          createdAt: pets.createdAt,
          updatedAt: pets.updatedAt,
          // New fields
          patientType: pets.patientType,
          environment: pets.environment,
          livesWithOtherAnimals: pets.livesWithOtherAnimals,
          otherAnimalsDetails: pets.otherAnimalsDetails,
          dietType: pets.dietType,
          dietBrand: pets.dietBrand,
          dietNotes: pets.dietNotes,
          knownAllergies: pets.knownAllergies,
          previousDiseases: pets.previousDiseases,
          previousSurgeries: pets.previousSurgeries,
          currentMedication: pets.currentMedication,
          isNeutered: pets.isNeutered,
          behavior: pets.behavior,
          lastDewormingDate: pets.lastDewormingDate,
          dewormingProduct: pets.dewormingProduct,
        })
        .from(pets)
        .leftJoin(owners, eq(pets.ownerId, owners.id))
        .where(eq(pets.id, input.id))
        .limit(1);

      if (!pet) return null;

      // Get last visit
      const [lastVisit] = await db
        .select({
          id: visits.id,
          visitDate: visits.visitDate,
          reason: visits.reason,
          diagnosis: visits.diagnosis,
        })
        .from(visits)
        .where(eq(visits.petId, input.id))
        .orderBy(desc(visits.visitDate))
        .limit(1);

      // Get last payment for this owner
      const [lastPayment] = await db
        .select({
          id: payments.id,
          amount: payments.amount,
          status: payments.status,
          method: payments.method,
          paidAt: payments.paidAt,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .where(eq(payments.ownerId, pet.ownerId))
        .orderBy(desc(payments.createdAt))
        .limit(1);

      // Get visit count
      const [visitCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(visits)
        .where(eq(visits.petId, input.id));

      return {
        ...pet,
        lastVisit: lastVisit ?? null,
        lastPayment: lastPayment ?? null,
        visitCount: visitCountResult?.count ?? 0,
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const result = await db
        .select({
          id: pets.id,
          name: pets.name,
          species: pets.species,
          breed: pets.breed,
          birthDate: pets.birthDate,
          sex: pets.sex,
          color: pets.color,
          weight: pets.weight,
          microchip: pets.microchip,
          photoUrl: pets.photoUrl,
          photoKey: pets.photoKey,
          notes: pets.notes,
          isActive: pets.isActive,
          ownerId: pets.ownerId,
          ownerName: owners.name,
          ownerPhone: owners.phone,
          ownerEmail: owners.email,
          ownerAddress: owners.address,
          createdAt: pets.createdAt,
          updatedAt: pets.updatedAt,
        })
        .from(pets)
        .leftJoin(owners, eq(pets.ownerId, owners.id))
        .where(eq(pets.id, input.id))
        .limit(1);
      return result[0] ?? null;
    }),

  // Get all unique species for filter chips
  getSpecies: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");
    const result = await db
      .select({ species: pets.species })
      .from(pets)
      .groupBy(pets.species)
      .orderBy(pets.species);
    return result.map(r => r.species);
  }),

  create: protectedProcedure
    .input(
      z.object({
        ownerId: z.number(),
        name: z.string().min(1),
        species: z.string().min(1),
        breed: z.string().optional(),
        birthDate: z.string().optional(),
        sex: z.enum(["macho", "hembra", "desconocido"]).optional(),
        color: z.string().optional(),
        weight: z.string().optional(),
        microchip: z.string().optional(),
        photoUrl: z.string().optional(),
        photoKey: z.string().optional(),
        notes: z.string().optional(),
        // New fields
        patientType: z.enum(["seguimiento", "visita_unica"]).optional(),
        environment: z.enum(["interior", "exterior", "mixto"]).optional(),
        livesWithOtherAnimals: z.boolean().optional(),
        otherAnimalsDetails: z.string().optional(),
        dietType: z.enum(["balanceado", "casera", "mixta", "barf", "otra"]).optional(),
        dietBrand: z.string().optional(),
        dietNotes: z.string().optional(),
        knownAllergies: z.string().optional(),
        previousDiseases: z.string().optional(),
        previousSurgeries: z.string().optional(),
        currentMedication: z.string().optional(),
        isNeutered: z.enum(["si", "no", "no_se"]).optional(),
        behavior: z.enum(["tranquilo", "nervioso", "agresivo", "miedoso", "otro"]).optional(),
        lastDewormingDate: z.string().optional(),
        dewormingProduct: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const [result] = await db.insert(pets).values({
        ownerId: input.ownerId,
        name: input.name,
        species: input.species,
        breed: input.breed ?? null,
        birthDate: input.birthDate ? new Date(input.birthDate) : null,
        sex: input.sex ?? "desconocido",
        color: input.color ?? null,
        weight: input.weight ?? null,
        microchip: input.microchip ?? null,
        photoUrl: input.photoUrl ?? null,
        photoKey: input.photoKey ?? null,
        notes: input.notes ?? null,
        patientType: input.patientType ?? null,
        environment: input.environment ?? null,
        livesWithOtherAnimals: input.livesWithOtherAnimals ?? null,
        otherAnimalsDetails: input.otherAnimalsDetails ?? null,
        dietType: input.dietType ?? null,
        dietBrand: input.dietBrand ?? null,
        dietNotes: input.dietNotes ?? null,
        knownAllergies: input.knownAllergies ?? null,
        previousDiseases: input.previousDiseases ?? null,
        previousSurgeries: input.previousSurgeries ?? null,
        currentMedication: input.currentMedication ?? null,
        isNeutered: input.isNeutered ?? null,
        behavior: input.behavior ?? null,
        lastDewormingDate: input.lastDewormingDate ? new Date(input.lastDewormingDate) : null,
        dewormingProduct: input.dewormingProduct ?? null,
      });
      return { id: result.insertId };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        ownerId: z.number().optional(),
        name: z.string().min(1).optional(),
        species: z.string().optional(),
        breed: z.string().optional(),
        birthDate: z.string().optional(),
        sex: z.enum(["macho", "hembra", "desconocido"]).optional(),
        color: z.string().optional(),
        weight: z.string().optional(),
        microchip: z.string().optional(),
        photoUrl: z.string().optional(),
        photoKey: z.string().optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
        patientType: z.enum(["seguimiento", "visita_unica"]).optional(),
        environment: z.enum(["interior", "exterior", "mixto"]).optional(),
        livesWithOtherAnimals: z.boolean().optional(),
        otherAnimalsDetails: z.string().optional(),
        dietType: z.enum(["balanceado", "casera", "mixta", "barf", "otra"]).optional(),
        dietBrand: z.string().optional(),
        dietNotes: z.string().optional(),
        knownAllergies: z.string().optional(),
        previousDiseases: z.string().optional(),
        previousSurgeries: z.string().optional(),
        currentMedication: z.string().optional(),
        isNeutered: z.enum(["si", "no", "no_se"]).optional(),
        behavior: z.enum(["tranquilo", "nervioso", "agresivo", "miedoso", "otro"]).optional(),
        lastDewormingDate: z.string().optional(),
        dewormingProduct: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const { id, birthDate, lastDewormingDate, ...rest } = input;
      await db
        .update(pets)
        .set({
          ...rest,
          birthDate: birthDate ? new Date(birthDate) : undefined,
          lastDewormingDate: lastDewormingDate ? new Date(lastDewormingDate) : undefined,
        })
        .where(eq(pets.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      await db.delete(pets).where(eq(pets.id, input.id));
      return { success: true };
    }),

  getUploadUrl: protectedProcedure
    .input(z.object({ fileName: z.string(), mimeType: z.string() }))
    .mutation(async ({ input }) => {
      const { nanoid } = await import("nanoid");
      const key = `pets/photos/${nanoid()}-${input.fileName}`;
      return { key };
    }),

  uploadPhoto: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        fileName: z.string(),
        mimeType: z.string(),
        fileBase64: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const { storagePut } = await import("../storage");
      const { nanoid } = await import("nanoid");
      const buffer = Buffer.from(input.fileBase64, "base64");
      const key = `pets/photos/${nanoid()}-${input.fileName}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      await db.update(pets).set({ photoUrl: url, photoKey: key }).where(eq(pets.id, input.petId));
      return { url, key };
    }),
});
