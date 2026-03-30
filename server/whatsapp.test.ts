import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Test Helpers ──────────────────────────────────────────────────────────────

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "regular-user",
      email: "user@example.com",
      name: "Regular User",
      loginMethod: "email",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAnonContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── WhatsApp Router Tests ─────────────────────────────────────────────────────

describe("whatsapp.getSettings", () => {
  it("allows admin to get settings", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const settings = await caller.whatsapp.getSettings();
    expect(settings).toBeDefined();
    expect(settings).toHaveProperty("isActive");
    expect(settings).toHaveProperty("aiAutoReply");
    expect(settings).toHaveProperty("isConfigured");
    expect(settings).toHaveProperty("webhookUrl", "/api/whatsapp/webhook");
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.whatsapp.getSettings()).rejects.toThrow();
  });

  it("rejects anonymous users", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    await expect(caller.whatsapp.getSettings()).rejects.toThrow();
  });
});

describe("whatsapp.updateSettings", () => {
  it("allows admin to update settings", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.whatsapp.updateSettings({
      businessName: "Test Vet Clinic",
      aiAutoReply: false,
      businessHoursStart: "08:00",
      businessHoursEnd: "20:00",
    });
    expect(result).toEqual({ success: true });

    // Verify the update persisted
    const settings = await caller.whatsapp.getSettings();
    expect(settings.businessName).toBe("Test Vet Clinic");
    expect(settings.aiAutoReply).toBe(false);
    expect(settings.businessHoursStart).toBe("08:00");
    expect(settings.businessHoursEnd).toBe("20:00");
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.whatsapp.updateSettings({ businessName: "Hacked" })
    ).rejects.toThrow();
  });
});

describe("whatsapp.listConversations", () => {
  it("allows authenticated user to list conversations", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const conversations = await caller.whatsapp.listConversations();
    expect(Array.isArray(conversations)).toBe(true);
  });

  it("rejects anonymous users", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    await expect(caller.whatsapp.listConversations()).rejects.toThrow();
  });
});

describe("whatsapp.getStats", () => {
  it("returns stats for authenticated user", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const stats = await caller.whatsapp.getStats();
    expect(stats).toHaveProperty("totalConversations");
    expect(stats).toHaveProperty("activeConversations");
    expect(stats).toHaveProperty("totalMessages");
    expect(stats).toHaveProperty("aiMessages");
    expect(typeof stats.totalConversations).toBe("number");
    expect(typeof stats.activeConversations).toBe("number");
    expect(typeof stats.totalMessages).toBe("number");
    expect(typeof stats.aiMessages).toBe("number");
  });
});

// ─── Webhook Service Tests ─────────────────────────────────────────────────────

describe("whatsapp webhook service", () => {
  it("exports processWebhook function", async () => {
    const { processWebhook } = await import("./whatsappService");
    expect(typeof processWebhook).toBe("function");
  });

  it("exports sendWhatsAppText function", async () => {
    const { sendWhatsAppText } = await import("./whatsappService");
    expect(typeof sendWhatsAppText).toBe("function");
  });

  it("exports sendWhatsAppInteractiveButtons function", async () => {
    const { sendWhatsAppInteractiveButtons } = await import("./whatsappService");
    expect(typeof sendWhatsAppInteractiveButtons).toBe("function");
  });

  it("exports getOrCreateConversation function", async () => {
    const { getOrCreateConversation } = await import("./whatsappService");
    expect(typeof getOrCreateConversation).toBe("function");
  });

  it("exports generateAIResponse function", async () => {
    const { generateAIResponse } = await import("./whatsappService");
    expect(typeof generateAIResponse).toBe("function");
  });

  it("exports getSettings function", async () => {
    const { getSettings } = await import("./whatsappService");
    expect(typeof getSettings).toBe("function");
    const settings = await getSettings();
    expect(settings).toBeDefined();
    expect(settings).toHaveProperty("isActive");
  });
});

// ─── Webhook Payload Parsing ───────────────────────────────────────────────────

describe("webhook payload handling", () => {
  it("ignores non-whatsapp_business_account payloads", async () => {
    const { processWebhook } = await import("./whatsappService");
    // Should not throw for invalid object type
    await expect(
      processWebhook({
        object: "instagram",
        entry: [],
      })
    ).resolves.not.toThrow();
  });

  it("handles empty entry array gracefully", async () => {
    const { processWebhook } = await import("./whatsappService");
    await expect(
      processWebhook({
        object: "whatsapp_business_account",
        entry: [],
      })
    ).resolves.not.toThrow();
  });
});
