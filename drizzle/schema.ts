import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  date,
  boolean,
} from "drizzle-orm/mysql-core";

// ─── Users (auth) ────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Owners (propietarios) ────────────────────────────────────────────────────
export const owners = mysqlTable("owners", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Owner = typeof owners.$inferSelect;
export type InsertOwner = typeof owners.$inferInsert;

// ─── Pets (mascotas) ──────────────────────────────────────────────────────────
export const pets = mysqlTable("pets", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => owners.id),
  name: varchar("name", { length: 255 }).notNull(),
  species: varchar("species", { length: 100 }).notNull(), // perro, gato, etc.
  breed: varchar("breed", { length: 100 }),
  birthDate: date("birthDate"),
  sex: mysqlEnum("sex", ["macho", "hembra", "desconocido"]).default("desconocido"),
  color: varchar("color", { length: 100 }),
  weight: decimal("weight", { precision: 5, scale: 2 }), // kg
  microchip: varchar("microchip", { length: 100 }),
  photoUrl: text("photoUrl"),
  photoKey: text("photoKey"),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Pet = typeof pets.$inferSelect;
export type InsertPet = typeof pets.$inferInsert;

// ─── Visits (visitas / historial clínico) ────────────────────────────────────
export const visits = mysqlTable("visits", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").notNull().references(() => pets.id),
  ownerId: int("ownerId").notNull().references(() => owners.id),
  visitDate: timestamp("visitDate").notNull(),
  reason: text("reason").notNull(),
  diagnosis: text("diagnosis"),
  treatment: text("treatment"),
  medications: text("medications"),
  nextSteps: text("nextSteps"),
  weight: decimal("weight", { precision: 5, scale: 2 }), // peso en la visita
  temperature: decimal("temperature", { precision: 4, scale: 1 }), // temperatura corporal
  heartRate: varchar("heartRate", { length: 20 }), // frecuencia cardíaca
  respRate: varchar("respRate", { length: 20 }), // frecuencia respiratoria
  bodyCondition: varchar("bodyCondition", { length: 20 }), // condición corporal (1-9)
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Visit = typeof visits.$inferSelect;
export type InsertVisit = typeof visits.$inferInsert;

// ─── Visit Attachments (archivos adjuntos por visita) ────────────────────────
export const visitAttachments = mysqlTable("visit_attachments", {
  id: int("id").autoincrement().primaryKey(),
  visitId: int("visitId").notNull().references(() => visits.id),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: text("fileKey").notNull(),
  fileUrl: text("fileUrl").notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"), // bytes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VisitAttachment = typeof visitAttachments.$inferSelect;
export type InsertVisitAttachment = typeof visitAttachments.$inferInsert;

// ─── Appointments (turnos) ────────────────────────────────────────────────────
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  petId: int("petId").references(() => pets.id),
  ownerId: int("ownerId").references(() => owners.id),
  // For public booking requests (client not yet in system)
  clientName: varchar("clientName", { length: 255 }),
  clientPhone: varchar("clientPhone", { length: 50 }),
  clientEmail: varchar("clientEmail", { length: 320 }),
  petName: varchar("petName", { length: 255 }),
  petSpecies: varchar("petSpecies", { length: 100 }),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  reason: text("reason"),
  address: text("address"),
  status: mysqlEnum("status", ["pendiente", "confirmado", "completado", "cancelado"])
    .default("pendiente")
    .notNull(),
  notes: text("notes"),
  visitId: int("visitId").references(() => visits.id), // linked after completion
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

// ─── Payments (pagos) ─────────────────────────────────────────────────────────
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  visitId: int("visitId").references(() => visits.id),
  appointmentId: int("appointmentId").references(() => appointments.id),
  ownerId: int("ownerId").notNull().references(() => owners.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("ARS").notNull(),
  method: mysqlEnum("method", ["efectivo", "transferencia", "otro"]).notNull(),
  status: mysqlEnum("status", ["pagado", "pendiente", "parcial"]).default("pendiente").notNull(),
  paidAt: timestamp("paidAt"),
  description: text("description"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
