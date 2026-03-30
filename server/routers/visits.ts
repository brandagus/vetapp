import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { visits, visitAttachments, pets, owners } from "../../drizzle/schema";
import { eq, desc, or, like } from "drizzle-orm";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";

export const visitsRouter = router({
  listByPet: protectedProcedure
    .input(z.object({ petId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      return db
        .select()
        .from(visits)
        .where(eq(visits.petId, input.petId))
        .orderBy(desc(visits.visitDate));
    }),

  listRecent: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      return db
        .select({
          id: visits.id,
          visitDate: visits.visitDate,
          reason: visits.reason,
          diagnosis: visits.diagnosis,
          petId: visits.petId,
          petName: pets.name,
          petSpecies: pets.species,
          ownerId: visits.ownerId,
          ownerName: owners.name,
        })
        .from(visits)
        .leftJoin(pets, eq(visits.petId, pets.id))
        .leftJoin(owners, eq(visits.ownerId, owners.id))
        .orderBy(desc(visits.visitDate))
        .limit(input?.limit ?? 10);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const [visit] = await db
        .select()
        .from(visits)
        .where(eq(visits.id, input.id))
        .limit(1);
      if (!visit) return null;
      const attachments = await db
        .select()
        .from(visitAttachments)
        .where(eq(visitAttachments.visitId, input.id))
        .orderBy(desc(visitAttachments.createdAt));
      return { ...visit, attachments };
    }),

  create: protectedProcedure
    .input(
      z.object({
        petId: z.number(),
        ownerId: z.number(),
        visitDate: z.string(),
        reason: z.string().min(1),
        diagnosis: z.string().optional(),
        treatment: z.string().optional(),
        medications: z.string().optional(),
        nextSteps: z.string().optional(),
        weight: z.string().optional(),
        temperature: z.string().optional(),
        heartRate: z.string().optional(),
        respRate: z.string().optional(),
        bodyCondition: z.string().optional(),
        mucosas: z.enum(["rosadas", "palidas", "ictericas", "cianoticas"]).optional(),
        hydration: z.enum(["normal", "leve", "moderada", "severa"]).optional(),
        lymphNodes: z.enum(["normal", "aumentados"]).optional(),
        dentalStatus: z.enum(["bueno", "regular", "malo"]).optional(),
        notes: z.string().optional(),
        audioUrl: z.string().optional(),
        audioTranscription: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const [result] = await db.insert(visits).values({
        petId: input.petId,
        ownerId: input.ownerId,
        visitDate: new Date(input.visitDate),
        reason: input.reason,
        diagnosis: input.diagnosis ?? null,
        treatment: input.treatment ?? null,
        medications: input.medications ?? null,
        nextSteps: input.nextSteps ?? null,
        weight: input.weight ?? null,
        temperature: input.temperature ?? null,
        heartRate: input.heartRate ?? null,
        respRate: input.respRate ?? null,
        bodyCondition: input.bodyCondition ?? null,
        mucosas: input.mucosas ?? null,
        hydration: input.hydration ?? null,
        lymphNodes: input.lymphNodes ?? null,
        dentalStatus: input.dentalStatus ?? null,
        notes: input.notes ?? null,
        audioUrl: input.audioUrl ?? null,
        audioTranscription: input.audioTranscription ?? null,
      });
      return { id: result.insertId };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        visitDate: z.string().optional(),
        reason: z.string().optional(),
        diagnosis: z.string().optional(),
        treatment: z.string().optional(),
        medications: z.string().optional(),
        nextSteps: z.string().optional(),
        weight: z.string().optional(),
        temperature: z.string().optional(),
        heartRate: z.string().optional(),
        respRate: z.string().optional(),
        bodyCondition: z.string().optional(),
        mucosas: z.enum(["rosadas", "palidas", "ictericas", "cianoticas"]).optional(),
        hydration: z.enum(["normal", "leve", "moderada", "severa"]).optional(),
        lymphNodes: z.enum(["normal", "aumentados"]).optional(),
        dentalStatus: z.enum(["bueno", "regular", "malo"]).optional(),
        notes: z.string().optional(),
        audioUrl: z.string().optional(),
        audioTranscription: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const { id, visitDate, ...rest } = input;
      await db
        .update(visits)
        .set({ ...rest, visitDate: visitDate ? new Date(visitDate) : undefined })
        .where(eq(visits.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      await db.delete(visitAttachments).where(eq(visitAttachments.visitId, input.id));
      await db.delete(visits).where(eq(visits.id, input.id));
      return { success: true };
    }),

  // File attachments
  uploadAttachment: protectedProcedure
    .input(
      z.object({
        visitId: z.number(),
        fileName: z.string(),
        mimeType: z.string(),
        fileSize: z.number().optional(),
        fileBase64: z.string(), // base64 encoded file content
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const buffer = Buffer.from(input.fileBase64, "base64");
      const key = `visits/${input.visitId}/attachments/${nanoid()}-${input.fileName}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      await db.insert(visitAttachments).values({
        visitId: input.visitId,
        fileName: input.fileName,
        fileKey: key,
        fileUrl: url,
        mimeType: input.mimeType,
        fileSize: input.fileSize ?? null,
      });
      return { url, key };
    }),

  deleteAttachment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      await db.delete(visitAttachments).where(eq(visitAttachments.id, input.id));
      return { success: true };
    }),

  getAttachments: protectedProcedure
    .input(z.object({ visitId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      return db
        .select()
        .from(visitAttachments)
        .where(eq(visitAttachments.visitId, input.visitId))
        .orderBy(desc(visitAttachments.createdAt));
    }),
});
