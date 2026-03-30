import { google } from "googleapis";
import { getDb } from "./db";
import { googleTokens, appointments, owners, pets } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── OAuth2 Client ───────────────────────────────────────────────────────────

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";

export function getOAuth2Client(redirectUri: string) {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

export function getAuthUrl(redirectUri: string, state: string) {
  const oauth2Client = getOAuth2Client(redirectUri);
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar"],
    state,
  });
}

export async function exchangeCode(code: string, redirectUri: string) {
  const oauth2Client = getOAuth2Client(redirectUri);
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// ─── Token Management ────────────────────────────────────────────────────────

export async function saveGoogleTokens(
  userId: number,
  accessToken: string,
  refreshToken: string | null | undefined,
  expiresAt: Date | null
) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");

  // Check if tokens already exist for this user
  const existing = await db
    .select()
    .from(googleTokens)
    .where(eq(googleTokens.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    const updateData: Record<string, unknown> = { accessToken };
    if (refreshToken) updateData.refreshToken = refreshToken;
    if (expiresAt) updateData.expiresAt = expiresAt;
    await db
      .update(googleTokens)
      .set(updateData)
      .where(eq(googleTokens.userId, userId));
  } else {
    await db.insert(googleTokens).values({
      userId,
      accessToken,
      refreshToken: refreshToken ?? null,
      expiresAt,
    });
  }
}

export async function getGoogleTokens(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(googleTokens)
    .where(eq(googleTokens.userId, userId))
    .limit(1);

  return result[0] ?? null;
}

export async function removeGoogleTokens(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(googleTokens).where(eq(googleTokens.userId, userId));
}

// ─── Authenticated Calendar Client ──────────────────────────────────────────

async function getCalendarClient(userId: number, redirectUri: string) {
  const tokens = await getGoogleTokens(userId);
  if (!tokens) return null;

  const oauth2Client = getOAuth2Client(redirectUri);
  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  // Auto-refresh tokens
  oauth2Client.on("tokens", async (newTokens) => {
    const expiresAt = newTokens.expiry_date
      ? new Date(newTokens.expiry_date)
      : null;
    await saveGoogleTokens(
      userId,
      newTokens.access_token ?? tokens.accessToken,
      newTokens.refresh_token ?? tokens.refreshToken,
      expiresAt
    );
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

// ─── Calendar Event CRUD ─────────────────────────────────────────────────────

function buildEventDescription(appointment: {
  reason?: string | null;
  address?: string | null;
  notes?: string | null;
  ownerName?: string | null;
  ownerPhone?: string | null;
  petName?: string | null;
  petSpecies?: string | null;
}) {
  const lines: string[] = [];
  if (appointment.ownerName) lines.push(`👤 Familiar: ${appointment.ownerName}`);
  if (appointment.ownerPhone) lines.push(`📱 Tel: ${appointment.ownerPhone}`);
  if (appointment.petName) {
    let petLine = `🐾 Paciente: ${appointment.petName}`;
    if (appointment.petSpecies) petLine += ` (${appointment.petSpecies})`;
    lines.push(petLine);
  }
  if (appointment.reason) lines.push(`\n📋 Motivo: ${appointment.reason}`);
  if (appointment.address) lines.push(`📍 Dirección: ${appointment.address}`);
  if (appointment.notes) lines.push(`\n📝 Notas: ${appointment.notes}`);
  lines.push("\n— Dra Branda Veterinaria");
  return lines.join("\n");
}

function buildEventSummary(appointment: {
  petName?: string | null;
  clientName?: string | null;
  ownerName?: string | null;
  reason?: string | null;
}) {
  const name = appointment.petName ?? "Paciente";
  const owner = appointment.ownerName ?? appointment.clientName ?? "";
  let summary = `🐾 ${name}`;
  if (owner) summary += ` (${owner})`;
  if (appointment.reason) summary += ` — ${appointment.reason}`;
  return summary;
}

export async function createCalendarEvent(
  userId: number,
  appointmentId: number,
  redirectUri: string
) {
  const calendar = await getCalendarClient(userId, redirectUri);
  if (!calendar) return null;

  const db = await getDb();
  if (!db) return null;

  // Fetch appointment with related data
  const [appt] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!appt) return null;

  let ownerName: string | null = null;
  let ownerPhone: string | null = null;
  let petName: string | null = appt.petName;
  let petSpecies: string | null = appt.petSpecies;

  if (appt.ownerId) {
    const [owner] = await db
      .select()
      .from(owners)
      .where(eq(owners.id, appt.ownerId))
      .limit(1);
    if (owner) {
      ownerName = owner.name;
      ownerPhone = owner.phone;
    }
  }
  if (appt.petId) {
    const [pet] = await db
      .select()
      .from(pets)
      .where(eq(pets.id, appt.petId))
      .limit(1);
    if (pet) {
      petName = pet.name;
      petSpecies = pet.species;
    }
  }

  const summary = buildEventSummary({
    petName,
    clientName: appt.clientName,
    ownerName,
    reason: appt.reason,
  });

  const description = buildEventDescription({
    reason: appt.reason,
    address: appt.address,
    notes: appt.notes,
    ownerName: ownerName ?? appt.clientName,
    ownerPhone: ownerPhone ?? appt.clientPhone,
    petName,
    petSpecies,
  });

  const statusColorMap: Record<string, string> = {
    pendiente: "5",    // banana/yellow
    confirmado: "2",   // sage/green
    completado: "9",   // blueberry
    cancelado: "11",   // tomato/red
  };

  try {
    const event = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary,
        description,
        location: appt.address ?? undefined,
        start: {
          dateTime: new Date(appt.startTime).toISOString(),
          timeZone: "America/Argentina/Buenos_Aires",
        },
        end: {
          dateTime: new Date(appt.endTime).toISOString(),
          timeZone: "America/Argentina/Buenos_Aires",
        },
        colorId: statusColorMap[appt.status] ?? "5",
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 60 },
            { method: "popup", minutes: 15 },
          ],
        },
      },
    });

    // Save the Google Calendar event ID
    if (event.data.id) {
      await db
        .update(appointments)
        .set({ googleCalendarEventId: event.data.id })
        .where(eq(appointments.id, appointmentId));
    }

    return event.data;
  } catch (error) {
    console.error("[Google Calendar] Error creating event:", error);
    return null;
  }
}

export async function updateCalendarEvent(
  userId: number,
  appointmentId: number,
  redirectUri: string
) {
  const calendar = await getCalendarClient(userId, redirectUri);
  if (!calendar) return null;

  const db = await getDb();
  if (!db) return null;

  const [appt] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!appt || !appt.googleCalendarEventId) return null;

  let ownerName: string | null = null;
  let ownerPhone: string | null = null;
  let petName: string | null = appt.petName;
  let petSpecies: string | null = appt.petSpecies;

  if (appt.ownerId) {
    const [owner] = await db
      .select()
      .from(owners)
      .where(eq(owners.id, appt.ownerId))
      .limit(1);
    if (owner) {
      ownerName = owner.name;
      ownerPhone = owner.phone;
    }
  }
  if (appt.petId) {
    const [pet] = await db
      .select()
      .from(pets)
      .where(eq(pets.id, appt.petId))
      .limit(1);
    if (pet) {
      petName = pet.name;
      petSpecies = pet.species;
    }
  }

  const summary = buildEventSummary({
    petName,
    clientName: appt.clientName,
    ownerName,
    reason: appt.reason,
  });

  const description = buildEventDescription({
    reason: appt.reason,
    address: appt.address,
    notes: appt.notes,
    ownerName: ownerName ?? appt.clientName,
    ownerPhone: ownerPhone ?? appt.clientPhone,
    petName,
    petSpecies,
  });

  const statusColorMap: Record<string, string> = {
    pendiente: "5",
    confirmado: "2",
    completado: "9",
    cancelado: "11",
  };

  try {
    const event = await calendar.events.update({
      calendarId: "primary",
      eventId: appt.googleCalendarEventId,
      requestBody: {
        summary,
        description,
        location: appt.address ?? undefined,
        start: {
          dateTime: new Date(appt.startTime).toISOString(),
          timeZone: "America/Argentina/Buenos_Aires",
        },
        end: {
          dateTime: new Date(appt.endTime).toISOString(),
          timeZone: "America/Argentina/Buenos_Aires",
        },
        colorId: statusColorMap[appt.status] ?? "5",
      },
    });
    return event.data;
  } catch (error) {
    console.error("[Google Calendar] Error updating event:", error);
    return null;
  }
}

export async function deleteCalendarEvent(
  userId: number,
  googleEventId: string,
  redirectUri: string
) {
  const calendar = await getCalendarClient(userId, redirectUri);
  if (!calendar) return false;

  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId: googleEventId,
    });
    return true;
  } catch (error) {
    console.error("[Google Calendar] Error deleting event:", error);
    return false;
  }
}
