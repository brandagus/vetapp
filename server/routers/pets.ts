import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { pets, owners } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

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

  create: protectedProcedure
    .input(
      z.object({
        ownerId: z.number(),
        name: z.string().min(1),
        species: z.string().min(1),
        breed: z.string().optional(),
        birthDate: z.string().optional(), // ISO date string
        sex: z.enum(["macho", "hembra", "desconocido"]).optional(),
        color: z.string().optional(),
        weight: z.string().optional(),
        microchip: z.string().optional(),
        photoUrl: z.string().optional(),
        photoKey: z.string().optional(),
        notes: z.string().optional(),
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
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const { id, birthDate, ...rest } = input;
      await db
        .update(pets)
        .set({
          ...rest,
          birthDate: birthDate ? new Date(birthDate) : undefined,
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
