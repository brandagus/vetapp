import { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { processWebhook, type WhatsAppWebhookPayload } from "./whatsappService";

export function registerWhatsAppWebhookRoutes(app: Express) {
  // ─── Webhook Verification (GET) ──────────────────────────────────────────
  // Meta sends a GET request to verify the webhook URL
  app.get("/api/whatsapp/webhook", (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log("[WhatsApp Webhook] Verification request:", { mode, token: token ? "***" : "missing" });

    if (mode === "subscribe" && token === ENV.whatsappVerifyToken) {
      console.log("[WhatsApp Webhook] Verification successful");
      res.status(200).send(challenge);
    } else {
      console.warn("[WhatsApp Webhook] Verification failed");
      res.status(403).send("Forbidden");
    }
  });

  // ─── Incoming Messages (POST) ────────────────────────────────────────────
  // Meta sends incoming messages and status updates here
  app.post("/api/whatsapp/webhook", async (req: Request, res: Response) => {
    try {
      const payload = req.body as WhatsAppWebhookPayload;

      if (!payload?.object || payload.object !== "whatsapp_business_account") {
        res.status(400).send("Invalid payload");
        return;
      }

      // Respond immediately with 200 to acknowledge receipt
      // Process asynchronously to avoid timeout
      res.status(200).send("EVENT_RECEIVED");

      // Process the webhook payload asynchronously
      processWebhook(payload).catch((err) => {
        console.error("[WhatsApp Webhook] Processing error:", err);
      });
    } catch (error) {
      console.error("[WhatsApp Webhook] Error:", error);
      res.status(200).send("EVENT_RECEIVED"); // Always return 200 to prevent retries
    }
  });

  console.log("[WhatsApp] Webhook routes registered at /api/whatsapp/webhook");
}
