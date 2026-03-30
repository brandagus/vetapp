import { Router } from "express";
import { getAuthUrl, exchangeCode, saveGoogleTokens } from "./googleCalendar";

const router = Router();

// GET /api/google/callback — OAuth2 callback from Google
router.get("/api/google/callback", async (req, res) => {
  try {
    const code = req.query.code as string;
    const state = req.query.state as string; // JSON: { origin, userId }

    if (!code || !state) {
      return res.status(400).send("Faltan parámetros");
    }

    let parsed: { origin: string; userId: number };
    try {
      parsed = JSON.parse(Buffer.from(state, "base64").toString());
    } catch {
      return res.status(400).send("Estado inválido");
    }

    const redirectUri = `${parsed.origin}/api/google/callback`;
    const tokens = await exchangeCode(code, redirectUri);

    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : null;

    await saveGoogleTokens(
      parsed.userId,
      tokens.access_token!,
      tokens.refresh_token,
      expiresAt
    );

    // Redirect back to the Turnos page with success
    res.redirect(`${parsed.origin}/turnos?gcal=connected`);
  } catch (error) {
    console.error("[Google Calendar] OAuth callback error:", error);
    res.redirect("/turnos?gcal=error");
  }
});

export function registerGoogleCalendarRoutes(app: import("express").Express) {
  app.use(router);
}
