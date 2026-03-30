import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import {
  whatsappConversations,
  whatsappMessages,
  whatsappSettings,
  owners,
  pets,
  appointments,
} from "../drizzle/schema";
import { eq, and, desc, gte, like, or, sql } from "drizzle-orm";

const GRAPH_API_BASE = "https://graph.facebook.com/v25.0";

// ─── WhatsApp Cloud API Helpers ──────────────────────────────────────────────

export async function sendWhatsAppText(to: string, body: string) {
  const url = `${GRAPH_API_BASE}/${ENV.whatsappPhoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.whatsappAccessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[WhatsApp] Send text failed:", err);
    throw new Error(`WhatsApp send failed: ${res.status}`);
  }

  const data = await res.json();
  return data?.messages?.[0]?.id as string | undefined;
}

export async function sendWhatsAppInteractiveButtons(
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>
) {
  const url = `${GRAPH_API_BASE}/${ENV.whatsappPhoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.whatsappAccessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: bodyText },
        action: {
          buttons: buttons.slice(0, 3).map((b) => ({
            type: "reply",
            reply: { id: b.id, title: b.title.slice(0, 20) },
          })),
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[WhatsApp] Send interactive failed:", err);
    throw new Error(`WhatsApp interactive send failed: ${res.status}`);
  }

  const data = await res.json();
  return data?.messages?.[0]?.id as string | undefined;
}

export async function sendWhatsAppInteractiveList(
  to: string,
  bodyText: string,
  buttonText: string,
  sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>
) {
  const url = `${GRAPH_API_BASE}/${ENV.whatsappPhoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.whatsappAccessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: bodyText },
        action: {
          button: buttonText.slice(0, 20),
          sections,
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[WhatsApp] Send list failed:", err);
    throw new Error(`WhatsApp list send failed: ${res.status}`);
  }

  const data = await res.json();
  return data?.messages?.[0]?.id as string | undefined;
}

export async function markMessageAsRead(messageId: string) {
  const url = `${GRAPH_API_BASE}/${ENV.whatsappPhoneNumberId}/messages`;
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.whatsappAccessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });
  } catch (e) {
    console.warn("[WhatsApp] Mark as read failed:", e);
  }
}

// ─── Conversation & Message DB Helpers ───────────────────────────────────────

export async function getOrCreateConversation(waId: string, contactName?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(whatsappConversations)
    .where(eq(whatsappConversations.waId, waId))
    .limit(1);

  if (existing.length > 0) {
    // Update contact name if provided and different
    if (contactName && contactName !== existing[0].contactName) {
      await db
        .update(whatsappConversations)
        .set({ contactName, lastMessageAt: new Date() })
        .where(eq(whatsappConversations.id, existing[0].id));
    } else {
      await db
        .update(whatsappConversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(whatsappConversations.id, existing[0].id));
    }
    return existing[0];
  }

  // Try to match with an existing owner by phone
  let matchedOwnerId: number | null = null;
  const normalizedPhone = waId.replace(/\D/g, "");
  const ownerMatches = await db
    .select()
    .from(owners)
    .where(
      or(
        like(owners.phone, `%${normalizedPhone.slice(-8)}%`),
        like(owners.phone, `%${waId}%`)
      )
    )
    .limit(1);

  if (ownerMatches.length > 0) {
    matchedOwnerId = ownerMatches[0].id;
  }

  const result = await db.insert(whatsappConversations).values({
    waId,
    contactName: contactName || null,
    ownerId: matchedOwnerId,
    lastMessageAt: new Date(),
  });

  const newConv = await db
    .select()
    .from(whatsappConversations)
    .where(eq(whatsappConversations.id, Number(result[0].insertId)))
    .limit(1);

  return newConv[0];
}

export async function saveMessage(
  conversationId: number,
  direction: "incoming" | "outgoing",
  body: string | null,
  opts?: {
    waMessageId?: string;
    messageType?: string;
    metadata?: string;
    status?: "sent" | "delivered" | "read" | "failed" | "received";
    aiGenerated?: boolean;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(whatsappMessages).values({
    conversationId,
    direction,
    body,
    waMessageId: opts?.waMessageId || null,
    messageType: opts?.messageType || "text",
    metadata: opts?.metadata || null,
    status: opts?.status || (direction === "incoming" ? "received" : "sent"),
    aiGenerated: opts?.aiGenerated || false,
  });
}

export async function getConversationHistory(conversationId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(whatsappMessages)
    .where(eq(whatsappMessages.conversationId, conversationId))
    .orderBy(desc(whatsappMessages.createdAt))
    .limit(limit);
}

export async function getSettings() {
  const db = await getDb();
  if (!db) return null;

  const rows = await db.select().from(whatsappSettings).limit(1);
  if (rows.length === 0) {
    // Create default settings
    await db.insert(whatsappSettings).values({
      isActive: false,
      aiAutoReply: true,
      businessName: "Dra Branda Veterinaria",
      welcomeMessage:
        "¡Hola! 🐾 Bienvenido/a a Dra Branda Veterinaria a Domicilio. ¿En qué puedo ayudarte?",
      outsideHoursMessage:
        "Gracias por escribirnos. En este momento estamos fuera de horario de atención. Te responderemos a la brevedad. 🕐",
      quickReplies: JSON.stringify([
        { id: "turno", title: "Pedir turno", body: "Quiero solicitar un turno para mi mascota." },
        { id: "consulta", title: "Consulta", body: "Tengo una consulta sobre mi mascota." },
        { id: "emergencia", title: "Emergencia", body: "Tengo una emergencia veterinaria." },
      ]),
    });
    const newRows = await db.select().from(whatsappSettings).limit(1);
    return newRows[0] || null;
  }
  return rows[0];
}

// ─── Context Gathering for AI ────────────────────────────────────────────────

async function getOwnerContext(ownerId: number | null) {
  if (!ownerId) return null;
  const db = await getDb();
  if (!db) return null;

  const ownerRows = await db.select().from(owners).where(eq(owners.id, ownerId)).limit(1);
  if (ownerRows.length === 0) return null;

  const owner = ownerRows[0];
  const petRows = await db.select().from(pets).where(eq(pets.ownerId, ownerId));

  const now = new Date();
  const upcomingAppts = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.ownerId, ownerId),
        gte(appointments.startTime, now),
        eq(appointments.status, "pendiente")
      )
    )
    .orderBy(appointments.startTime)
    .limit(5);

  return {
    owner,
    pets: petRows,
    upcomingAppointments: upcomingAppts,
  };
}

async function searchPetByName(name: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      pet: pets,
      ownerName: owners.name,
      ownerPhone: owners.phone,
    })
    .from(pets)
    .leftJoin(owners, eq(pets.ownerId, owners.id))
    .where(like(pets.name, `%${name}%`))
    .limit(5);
}

async function getAvailableSlots() {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Get existing appointments for the next week
  const existingAppts = await db
    .select()
    .from(appointments)
    .where(
      and(
        gte(appointments.startTime, now),
        gte(appointments.endTime, now),
        or(
          eq(appointments.status, "pendiente"),
          eq(appointments.status, "confirmado")
        )
      )
    )
    .orderBy(appointments.startTime);

  // Generate available slots (9am-18pm, 1h each, Mon-Fri)
  const slots: Array<{ date: string; time: string; available: boolean }> = [];
  const busyTimes = new Set(
    existingAppts.map((a) => a.startTime.toISOString().slice(0, 16))
  );

  for (let d = 0; d < 7; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

    for (let h = 9; h < 18; h++) {
      const slotDate = new Date(date);
      slotDate.setHours(h, 0, 0, 0);
      if (slotDate <= now) continue;

      const key = slotDate.toISOString().slice(0, 16);
      if (!busyTimes.has(key)) {
        slots.push({
          date: slotDate.toLocaleDateString("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }),
          time: `${h}:00`,
          available: true,
        });
      }
    }
  }

  return slots.slice(0, 10); // Return up to 10 available slots
}

// ─── AI Response Engine ──────────────────────────────────────────────────────

export async function generateAIResponse(
  conversationId: number,
  waId: string,
  incomingMessage: string,
  contactName?: string
): Promise<string> {
  const settings = await getSettings();
  if (!settings) return "Lo siento, el sistema no está disponible en este momento.";

  // Get conversation for owner context
  const db = await getDb();
  if (!db) return "Error interno del sistema.";

  const convRows = await db
    .select()
    .from(whatsappConversations)
    .where(eq(whatsappConversations.id, conversationId))
    .limit(1);

  const conversation = convRows[0];

  // Get recent message history for context
  const history = await getConversationHistory(conversationId, 10);
  const historyFormatted = history
    .reverse()
    .map(
      (m) =>
        `${m.direction === "incoming" ? "Cliente" : "Veterinaria"}: ${m.body || "[mensaje interactivo]"}`
    )
    .join("\n");

  // Get owner/pet context if linked
  const ownerContext = await getOwnerContext(conversation?.ownerId || null);

  // Get available appointment slots
  const availableSlots = await getAvailableSlots();

  // Build system prompt
  const systemPrompt = buildSystemPrompt(
    settings,
    ownerContext,
    availableSlots,
    contactName
  );

  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        ...(historyFormatted
          ? [{ role: "user" as const, content: `Historial reciente:\n${historyFormatted}` }]
          : []),
        { role: "user", content: incomingMessage },
      ],
    });

    const aiResponse =
      typeof result.choices[0]?.message?.content === "string"
        ? result.choices[0].message.content
        : "Lo siento, no pude procesar tu mensaje. ¿Podrías reformularlo?";

    return aiResponse.slice(0, 4096); // WhatsApp text limit
  } catch (error) {
    console.error("[WhatsApp AI] LLM error:", error);
    return "Disculpá, hubo un error procesando tu mensaje. Por favor intentá de nuevo o llamanos directamente. 📞";
  }
}

function buildSystemPrompt(
  settings: NonNullable<Awaited<ReturnType<typeof getSettings>>>,
  ownerContext: Awaited<ReturnType<typeof getOwnerContext>>,
  availableSlots: Array<{ date: string; time: string }>,
  contactName?: string
) {
  let prompt = `Sos el asistente virtual de "${settings.businessName || "Dra Branda Veterinaria"}", una veterinaria a domicilio en Argentina.

REGLAS IMPORTANTES:
- Respondé siempre en español argentino (vos, tenés, podés, etc.)
- Sé amable, profesional y empático con los dueños de mascotas
- Usá emojis con moderación (🐾 🐶 🐱 ✅ 📅)
- Mantené las respuestas cortas y claras (máximo 3-4 oraciones)
- NUNCA des diagnósticos médicos, solo orientación general
- Si es una emergencia, indicá que llamen inmediatamente
- Para turnos, ofrecé los horarios disponibles
- Si no sabés algo, decí que vas a consultar con la doctora

HORARIO DE ATENCIÓN: ${settings.businessHoursStart || "09:00"} a ${settings.businessHoursEnd || "18:00"}, ${settings.workDays === "1,2,3,4,5" ? "lunes a viernes" : "días hábiles"}

SERVICIOS:
- Consultas veterinarias a domicilio
- Vacunación
- Control de rutina
- Desparasitación
- Atención de urgencias (según disponibilidad)
`;

  if (contactName) {
    prompt += `\nEl cliente se llama: ${contactName}\n`;
  }

  if (ownerContext) {
    prompt += `\nINFORMACIÓN DEL CLIENTE EN SISTEMA:`;
    prompt += `\nNombre: ${ownerContext.owner.name}`;
    if (ownerContext.owner.phone) prompt += `\nTeléfono: ${ownerContext.owner.phone}`;
    if (ownerContext.owner.address) prompt += `\nDirección: ${ownerContext.owner.address}`;

    if (ownerContext.pets.length > 0) {
      prompt += `\n\nMASCOTAS REGISTRADAS:`;
      for (const pet of ownerContext.pets) {
        prompt += `\n- ${pet.name} (${pet.species}${pet.breed ? `, ${pet.breed}` : ""}${pet.sex ? `, ${pet.sex}` : ""})`;
      }
    }

    if (ownerContext.upcomingAppointments.length > 0) {
      prompt += `\n\nTURNOS PRÓXIMOS:`;
      for (const appt of ownerContext.upcomingAppointments) {
        prompt += `\n- ${appt.startTime.toLocaleDateString("es-AR")} ${appt.startTime.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} - ${appt.petName || "sin especificar"} (${appt.status})`;
      }
    }
  }

  if (availableSlots.length > 0) {
    prompt += `\n\nHORARIOS DISPONIBLES PARA TURNOS:`;
    for (const slot of availableSlots.slice(0, 6)) {
      prompt += `\n- ${slot.date} a las ${slot.time}`;
    }
    prompt += `\n\nSi el cliente quiere un turno, ofrecé estos horarios y pedí: nombre del dueño, nombre y especie de la mascota, motivo de la consulta, y dirección.`;
  }

  return prompt;
}

// ─── Webhook Processing ──────────────────────────────────────────────────────

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body: string };
          interactive?: {
            type: string;
            button_reply?: { id: string; title: string };
            list_reply?: { id: string; title: string; description?: string };
          };
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

export async function processWebhook(payload: WhatsAppWebhookPayload) {
  const settings = await getSettings();
  if (!settings?.isActive) {
    console.log("[WhatsApp] Integration not active, ignoring webhook");
    return;
  }

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages") continue;

      const value = change.value;

      // Handle incoming messages
      if (value.messages) {
        for (const msg of value.messages) {
          await handleIncomingMessage(msg, value.contacts?.[0], settings);
        }
      }

      // Handle status updates
      if (value.statuses) {
        for (const status of value.statuses) {
          await handleStatusUpdate(status);
        }
      }
    }
  }
}

async function handleIncomingMessage(
  msg: NonNullable<WhatsAppWebhookPayload["entry"][0]["changes"][0]["value"]["messages"]>[0],
  contact: { profile: { name: string }; wa_id: string } | undefined,
  settings: NonNullable<Awaited<ReturnType<typeof getSettings>>>
) {
  const waId = msg.from;
  const contactName = contact?.profile?.name;

  // Mark as read
  await markMessageAsRead(msg.id);

  // Get or create conversation
  const conversation = await getOrCreateConversation(waId, contactName);

  // Extract message text
  let messageText = "";
  let messageType = msg.type;

  if (msg.type === "text" && msg.text?.body) {
    messageText = msg.text.body;
  } else if (msg.type === "interactive") {
    if (msg.interactive?.button_reply) {
      messageText = msg.interactive.button_reply.title;
      messageType = "button_reply";
    } else if (msg.interactive?.list_reply) {
      messageText = msg.interactive.list_reply.title;
      messageType = "list_reply";
    }
  } else {
    // Unsupported message type
    messageText = `[${msg.type}]`;
  }

  // Save incoming message
  await saveMessage(conversation.id, "incoming", messageText, {
    waMessageId: msg.id,
    messageType,
    status: "received",
  });

  // Check if AI auto-reply is enabled for this conversation
  if (!settings.aiAutoReply || !conversation.aiEnabled) {
    console.log("[WhatsApp] AI auto-reply disabled, skipping response");
    return;
  }

  // Check business hours
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  const [startH, startM] = (settings.businessHoursStart || "09:00").split(":").map(Number);
  const [endH, endM] = (settings.businessHoursEnd || "18:00").split(":").map(Number);
  const startTime = startH * 60 + startM;
  const endTime = endH * 60 + endM;
  const currentDay = now.getDay();
  const workDays = (settings.workDays || "1,2,3,4,5").split(",").map(Number);

  const isBusinessHours =
    workDays.includes(currentDay) && currentTime >= startTime && currentTime < endTime;

  if (!isBusinessHours && settings.outsideHoursMessage) {
    // Send outside hours message
    const waMessageId = await sendWhatsAppText(waId, settings.outsideHoursMessage);
    await saveMessage(conversation.id, "outgoing", settings.outsideHoursMessage, {
      waMessageId: waMessageId || undefined,
      aiGenerated: true,
    });
    return;
  }

  // Generate AI response
  const aiResponse = await generateAIResponse(
    conversation.id,
    waId,
    messageText,
    contactName
  );

  // Send response
  const waMessageId = await sendWhatsAppText(waId, aiResponse);

  // Save outgoing message
  await saveMessage(conversation.id, "outgoing", aiResponse, {
    waMessageId: waMessageId || undefined,
    aiGenerated: true,
  });
}

async function handleStatusUpdate(status: {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
}) {
  const db = await getDb();
  if (!db) return;

  // Update message status
  const validStatuses = ["sent", "delivered", "read", "failed"] as const;
  const statusValue = validStatuses.includes(status.status as any)
    ? (status.status as (typeof validStatuses)[number])
    : null;

  if (statusValue && status.id) {
    await db
      .update(whatsappMessages)
      .set({ status: statusValue })
      .where(eq(whatsappMessages.waMessageId, status.id));
  }
}
