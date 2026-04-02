import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  whatsappConversations,
  whatsappMessages,
  whatsappSettings,
  owners,
} from "../../drizzle/schema";
import { eq, desc, and, like, sql } from "drizzle-orm";
import {
  sendWhatsAppText,
  sendWhatsAppInteractiveButtons,
  saveMessage,
  getSettings,
} from "../whatsappService";
import { ENV } from "../_core/env";

export const whatsappRouter = router({
  // ─── Settings ────────────────────────────────────────────────────────────
  getSettings: adminProcedure.query(async () => {
    const settings = await getSettings();
    return {
      ...settings,
      isConfigured: !!(ENV.whatsappAccessToken && ENV.whatsappPhoneNumberId && ENV.whatsappVerifyToken),
      webhookUrl: "/api/whatsapp/webhook",
    };
  }),

  updateSettings: adminProcedure
    .input(
      z.object({
        isActive: z.boolean().optional(),
        aiAutoReply: z.boolean().optional(),
        businessName: z.string().optional(),
        welcomeMessage: z.string().optional(),
        outsideHoursMessage: z.string().optional(),
        businessHoursStart: z.string().optional(),
        businessHoursEnd: z.string().optional(),
        workDays: z.string().optional(),
        quickReplies: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");

      // Ensure settings row exists and get its id
      const currentSettings = await getSettings();
      if (!currentSettings) throw new Error("No se pudieron obtener las configuraciones");

      const updateData: Record<string, unknown> = {};
      if (input.isActive !== undefined) updateData.isActive = input.isActive;
      if (input.aiAutoReply !== undefined) updateData.aiAutoReply = input.aiAutoReply;
      if (input.businessName !== undefined) updateData.businessName = input.businessName;
      if (input.welcomeMessage !== undefined) updateData.welcomeMessage = input.welcomeMessage;
      if (input.outsideHoursMessage !== undefined) updateData.outsideHoursMessage = input.outsideHoursMessage;
      if (input.businessHoursStart !== undefined) updateData.businessHoursStart = input.businessHoursStart;
      if (input.businessHoursEnd !== undefined) updateData.businessHoursEnd = input.businessHoursEnd;
      if (input.workDays !== undefined) updateData.workDays = input.workDays;
      if (input.quickReplies !== undefined) updateData.quickReplies = input.quickReplies;

      if (Object.keys(updateData).length > 0) {
        await db
          .update(whatsappSettings)
          .set(updateData)
          .where(eq(whatsappSettings.id, currentSettings.id));
      }

      return { success: true };
    }),

  // ─── Conversations ───────────────────────────────────────────────────────
  listConversations: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.enum(["active", "closed", "archived"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");

      const conditions = [];
      if (input?.status) {
        conditions.push(eq(whatsappConversations.status, input.status));
      }
      if (input?.search) {
        conditions.push(
          like(whatsappConversations.contactName, `%${input.search}%`)
        );
      }

      const rows = await db
        .select({
          id: whatsappConversations.id,
          waId: whatsappConversations.waId,
          contactName: whatsappConversations.contactName,
          ownerId: whatsappConversations.ownerId,
          ownerName: owners.name,
          status: whatsappConversations.status,
          aiEnabled: whatsappConversations.aiEnabled,
          lastMessageAt: whatsappConversations.lastMessageAt,
          createdAt: whatsappConversations.createdAt,
        })
        .from(whatsappConversations)
        .leftJoin(owners, eq(whatsappConversations.ownerId, owners.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(whatsappConversations.lastMessageAt))
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);

      // Get last message for each conversation
      const conversationsWithLastMsg = await Promise.all(
        rows.map(async (conv) => {
          const lastMsg = await db
            .select({
              body: whatsappMessages.body,
              direction: whatsappMessages.direction,
              createdAt: whatsappMessages.createdAt,
            })
            .from(whatsappMessages)
            .where(eq(whatsappMessages.conversationId, conv.id))
            .orderBy(desc(whatsappMessages.createdAt))
            .limit(1);

          const unreadCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(whatsappMessages)
            .where(
              and(
                eq(whatsappMessages.conversationId, conv.id),
                eq(whatsappMessages.direction, "incoming"),
                eq(whatsappMessages.status, "received")
              )
            );

          return {
            ...conv,
            lastMessage: lastMsg[0] || null,
            unreadCount: Number(unreadCount[0]?.count || 0),
          };
        })
      );

      return conversationsWithLastMsg;
    }),

  // ─── Messages ────────────────────────────────────────────────────────────
  getMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");

      const messages = await db
        .select()
        .from(whatsappMessages)
        .where(eq(whatsappMessages.conversationId, input.conversationId))
        .orderBy(desc(whatsappMessages.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return messages.reverse(); // Oldest first for display
    }),

  // ─── Send Manual Message ─────────────────────────────────────────────────
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        body: z.string().min(1).max(4096),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");

      // Get conversation
      const conv = await db
        .select()
        .from(whatsappConversations)
        .where(eq(whatsappConversations.id, input.conversationId))
        .limit(1);

      if (conv.length === 0) throw new Error("Conversación no encontrada");

      // Send via WhatsApp API
      const waMessageId = await sendWhatsAppText(conv[0].waId, input.body);

      // Save to DB
      await saveMessage(input.conversationId, "outgoing", input.body, {
        waMessageId: waMessageId || undefined,
        aiGenerated: false,
      });

      // Update last message timestamp
      await db
        .update(whatsappConversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(whatsappConversations.id, input.conversationId));

      return { success: true, waMessageId };
    }),

  // ─── Toggle AI for Conversation ──────────────────────────────────────────
  toggleAI: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        aiEnabled: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");

      await db
        .update(whatsappConversations)
        .set({ aiEnabled: input.aiEnabled })
        .where(eq(whatsappConversations.id, input.conversationId));

      return { success: true };
    }),

  // ─── Link Conversation to Owner ──────────────────────────────────────────
  linkOwner: adminProcedure
    .input(
      z.object({
        conversationId: z.number(),
        ownerId: z.number().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");

      await db
        .update(whatsappConversations)
        .set({ ownerId: input.ownerId })
        .where(eq(whatsappConversations.id, input.conversationId));

      return { success: true };
    }),

  // ─── Archive/Close Conversation ──────────────────────────────────────────
  updateConversationStatus: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        status: z.enum(["active", "closed", "archived"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");

      await db
        .update(whatsappConversations)
        .set({ status: input.status })
        .where(eq(whatsappConversations.id, input.conversationId));

      return { success: true };
    }),

  // ─── Stats ───────────────────────────────────────────────────────────────
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");

    const totalConversations = await db
      .select({ count: sql<number>`count(*)` })
      .from(whatsappConversations);

    const activeConversations = await db
      .select({ count: sql<number>`count(*)` })
      .from(whatsappConversations)
      .where(eq(whatsappConversations.status, "active"));

    const totalMessages = await db
      .select({ count: sql<number>`count(*)` })
      .from(whatsappMessages);

    const aiMessages = await db
      .select({ count: sql<number>`count(*)` })
      .from(whatsappMessages)
      .where(eq(whatsappMessages.aiGenerated, true));

    return {
      totalConversations: Number(totalConversations[0]?.count || 0),
      activeConversations: Number(activeConversations[0]?.count || 0),
      totalMessages: Number(totalMessages[0]?.count || 0),
      aiMessages: Number(aiMessages[0]?.count || 0),
    };
  }),
});
