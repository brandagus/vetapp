# VetApp — Project Status Document

**Project:** Dra Branda Veterinaria — Gestión Veterinaria a Domicilio
**Last Updated:** April 2, 2026
**Version:** `3221b508`
**Domain:** `vetapp-juil9ung.manus.space`

---

## 1. Tech Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| **Frontend Framework** | React | 19.2.1 | Single-page application |
| **Routing** | Wouter | 3.3.5 | Lightweight React router |
| **State Management** | TanStack React Query | 5.90.2 | Server state via tRPC hooks |
| **Styling** | Tailwind CSS | 4.1.14 | Utility-first CSS framework |
| **UI Components** | shadcn/ui (Radix primitives) | Various | Accordion, Dialog, Select, Tabs, etc. |
| **Animations** | Framer Motion | 12.23.22 | Page transitions and micro-interactions |
| **Charts** | Recharts | 2.15.2 | Dashboard visualizations |
| **Icons** | Lucide React | 0.453.0 | Consistent icon set |
| **Forms** | React Hook Form + Zod | 7.64.0 / 4.1.12 | Validated forms with schema inference |
| **API Layer** | tRPC | 11.6.0 | End-to-end type-safe RPC |
| **Serialization** | SuperJSON | 1.13.3 | Date/BigInt serialization over tRPC |
| **Backend Runtime** | Node.js + Express | 22.13.0 / 4.21.2 | HTTP server with tRPC middleware |
| **Language** | TypeScript | 5.9.3 | Strict mode across client and server |
| **Database** | MySQL (TiDB) | via mysql2 3.15.0 | Cloud-hosted relational database |
| **ORM** | Drizzle ORM | 0.44.5 | Schema-first, type-safe queries |
| **Migrations** | Drizzle Kit | 0.31.4 | `pnpm db:push` generates and migrates |
| **Authentication** | Manus OAuth + Local email/password | jose 6.1.0 | JWT session cookies |
| **Password Hashing** | bcryptjs | 3.0.3 | 12 salt rounds |
| **File Storage** | S3 (Manus Storage Proxy) | AWS SDK v3 | Public URLs, no signing needed |
| **LLM Integration** | Manus Built-in LLM (invokeLLM) | Internal | Used for voice transcription extraction and WhatsApp AI |
| **Voice Transcription** | Whisper API (transcribeAudio) | Internal | Spanish language, veterinary context prompts |
| **Google Calendar** | Google APIs (googleapis) | 171.4.0 | OAuth2 token management, event CRUD |
| **WhatsApp** | Meta Cloud API v25 | REST | Graph API for messaging |
| **Build Tool** | Vite | 7.1.7 | Dev server + production build |
| **Bundler (Server)** | esbuild | 0.25.0 | Server-side production bundle |
| **Testing** | Vitest | 2.1.4 | Unit tests with mocked DB |
| **Package Manager** | pnpm | 10.4.1 | Lockfile-based dependency management |
| **Hosting** | Manus Platform | Built-in | Auto-deploy from checkpoints |

---

## 2. Database Schema

The database uses MySQL (TiDB) with Drizzle ORM. All tables are defined in `drizzle/schema.ts`. Timestamps use MySQL `timestamp` type with `defaultNow()`.

### 2.1 `users` — System Users (Authentication)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | int | PK, auto-increment | Internal user ID |
| `openId` | varchar(64) | NOT NULL, UNIQUE | OAuth subject or `local_{uuid}` for email users |
| `name` | text | nullable | Display name |
| `email` | varchar(320) | nullable | Email address (unique for local auth) |
| `loginMethod` | varchar(64) | nullable | `"email"` for local users, null for OAuth |
| `passwordHash` | text | nullable | bcrypt hash (only for email/password users) |
| `role` | enum(`user`, `admin`) | NOT NULL, default `user` | Access level |
| `isActive` | boolean | NOT NULL, default `true` | Account activation status |
| `createdAt` | timestamp | NOT NULL, default now | Account creation time |
| `updatedAt` | timestamp | NOT NULL, auto-update | Last modification time |
| `lastSignedIn` | timestamp | NOT NULL, default now | Last login timestamp |

**Relationships:** Referenced by `google_tokens.userId`.

### 2.2 `owners` — Familiares (Pet Owners)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | int | PK, auto-increment | Owner ID |
| `name` | varchar(255) | NOT NULL | Full name |
| `phone` | varchar(50) | nullable | Phone number |
| `email` | varchar(320) | nullable | Email address |
| `address` | text | nullable | Home address (for domiciliary visits) |
| `notes` | text | nullable | Internal notes |
| `createdAt` | timestamp | NOT NULL | — |
| `updatedAt` | timestamp | NOT NULL | — |

**Relationships:** Referenced by `pets.ownerId`, `visits.ownerId`, `appointments.ownerId`, `payments.ownerId`, `whatsapp_conversations.ownerId`.

### 2.3 `pets` — Pacientes (Animals)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | int | PK, auto-increment | Pet ID |
| `ownerId` | int | NOT NULL, FK → owners.id | Linked owner |
| `name` | varchar(255) | NOT NULL | Pet name |
| `species` | varchar(100) | NOT NULL | Species (perro, gato, conejo, etc.) |
| `breed` | varchar(100) | nullable | Breed |
| `birthDate` | date | nullable | Date of birth |
| `sex` | enum(`macho`, `hembra`, `desconocido`) | default `desconocido` | Sex |
| `color` | varchar(100) | nullable | Coat color |
| `weight` | decimal(5,2) | nullable | Weight in kg |
| `microchip` | varchar(100) | nullable | Microchip number |
| `photoUrl` | text | nullable | S3 URL of pet photo |
| `photoKey` | text | nullable | S3 key of pet photo |
| `notes` | text | nullable | General notes |
| `isActive` | boolean | NOT NULL, default true | Active patient flag |
| `patientType` | enum(`seguimiento`, `visita_unica`) | default `visita_unica` | Follow-up vs one-time |
| `environment` | enum(`interior`, `exterior`, `mixto`) | nullable | Living environment |
| `livesWithOtherAnimals` | boolean | nullable | Cohabitation flag |
| `otherAnimalsDetails` | text | nullable | Details about other animals |
| `dietType` | enum(`balanceado`, `casera`, `mixta`, `barf`, `otra`) | nullable | Diet type |
| `dietBrand` | varchar(255) | nullable | Food brand |
| `dietNotes` | text | nullable | Diet notes |
| `knownAllergies` | text | nullable | Known allergies |
| `previousDiseases` | text | nullable | Disease history |
| `previousSurgeries` | text | nullable | Surgery history |
| `currentMedication` | text | nullable | Current medications |
| `isNeutered` | enum(`si`, `no`, `no_se`) | nullable | Neutering status |
| `behavior` | enum(`tranquilo`, `nervioso`, `agresivo`, `miedoso`, `otro`) | nullable | Temperament |
| `lastDewormingDate` | date | nullable | Last deworming date |
| `dewormingProduct` | varchar(255) | nullable | Deworming product used |
| `createdAt` | timestamp | NOT NULL | — |
| `updatedAt` | timestamp | NOT NULL | — |

**Relationships:** Referenced by `visits.petId`, `appointments.petId`, `vaccinations.petId`.

### 2.4 `vaccinations` — Vacunas

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | int | PK, auto-increment | Vaccination ID |
| `petId` | int | NOT NULL, FK → pets.id | Linked pet |
| `vaccineName` | varchar(255) | NOT NULL | Vaccine name |
| `laboratory` | varchar(255) | nullable | Manufacturer |
| `lotNumber` | varchar(100) | nullable | Lot/batch number |
| `doseNumber` | varchar(50) | nullable | Dose label ("1ra", "2da", "refuerzo", "anual") |
| `applicationDate` | date | NOT NULL | Date administered |
| `nextDoseDate` | date | nullable | Scheduled next dose |
| `status` | enum(`aplicada`, `programada`, `vencida`) | NOT NULL, default `aplicada` | Vaccination status |
| `notes` | text | nullable | Notes |
| `createdAt` | timestamp | NOT NULL | — |
| `updatedAt` | timestamp | NOT NULL | — |

### 2.5 `visits` — Visitas (Clinical History)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | int | PK, auto-increment | Visit ID |
| `petId` | int | NOT NULL, FK → pets.id | Patient |
| `ownerId` | int | NOT NULL, FK → owners.id | Owner present at visit |
| `visitDate` | timestamp | NOT NULL | Date and time of visit |
| `reason` | text | NOT NULL | Reason for visit |
| `diagnosis` | text | nullable | Diagnosis |
| `treatment` | text | nullable | Treatment prescribed |
| `medications` | text | nullable | Medications prescribed |
| `nextSteps` | text | nullable | Follow-up instructions |
| `weight` | decimal(5,2) | nullable | Weight at visit (kg) |
| `temperature` | decimal(4,1) | nullable | Temperature (°C) |
| `heartRate` | varchar(20) | nullable | Heart rate |
| `respRate` | varchar(20) | nullable | Respiratory rate |
| `bodyCondition` | varchar(20) | nullable | Body condition score |
| `mucosas` | enum(`rosadas`, `palidas`, `ictericas`, `cianoticas`) | nullable | Mucous membrane status |
| `hydration` | enum(`normal`, `leve`, `moderada`, `severa`) | nullable | Dehydration level |
| `lymphNodes` | enum(`normal`, `aumentados`) | nullable | Lymph node status |
| `dentalStatus` | enum(`bueno`, `regular`, `malo`) | nullable | Dental health |
| `notes` | text | nullable | Additional clinical notes |
| `audioUrl` | text | nullable | S3 URL of voice recording |
| `audioTranscription` | text | nullable | Whisper transcription of audio |
| `createdAt` | timestamp | NOT NULL | — |
| `updatedAt` | timestamp | NOT NULL | — |

**Relationships:** Referenced by `visit_attachments.visitId`, `payments.visitId`, `appointments.visitId`.

### 2.6 `visit_attachments` — Archivos Adjuntos de Visitas

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | int | PK, auto-increment | Attachment ID |
| `visitId` | int | NOT NULL, FK → visits.id | Parent visit |
| `fileName` | varchar(255) | NOT NULL | Original file name |
| `fileKey` | text | NOT NULL | S3 storage key |
| `fileUrl` | text | NOT NULL | Public S3 URL |
| `mimeType` | varchar(100) | nullable | MIME type |
| `fileSize` | int | nullable | File size in bytes |
| `createdAt` | timestamp | NOT NULL | — |

### 2.7 `appointments` — Turnos

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | int | PK, auto-increment | Appointment ID |
| `petId` | int | nullable, FK → pets.id | Linked pet (if registered) |
| `ownerId` | int | nullable, FK → owners.id | Linked owner (if registered) |
| `clientName` | varchar(255) | nullable | Client name (for unregistered clients) |
| `clientPhone` | varchar(50) | nullable | Client phone |
| `clientEmail` | varchar(320) | nullable | Client email |
| `petName` | varchar(255) | nullable | Pet name (for unregistered pets) |
| `petSpecies` | varchar(100) | nullable | Pet species (for unregistered pets) |
| `startTime` | timestamp | NOT NULL | Appointment start |
| `endTime` | timestamp | NOT NULL | Appointment end |
| `reason` | text | nullable | Reason for appointment |
| `address` | text | nullable | Visit address |
| `status` | enum(`pendiente`, `confirmado`, `completado`, `cancelado`) | NOT NULL, default `pendiente` | Appointment status |
| `notes` | text | nullable | Notes |
| `visitId` | int | nullable, FK → visits.id | Linked visit (after completion) |
| `googleCalendarEventId` | varchar(255) | nullable | Synced Google Calendar event ID |
| `createdAt` | timestamp | NOT NULL | — |
| `updatedAt` | timestamp | NOT NULL | — |

### 2.8 `google_tokens` — Google Calendar OAuth Tokens

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | int | PK, auto-increment | Token ID |
| `userId` | int | NOT NULL, FK → users.id | Owning user |
| `accessToken` | text | NOT NULL | Google access token |
| `refreshToken` | text | nullable | Google refresh token |
| `expiresAt` | timestamp | nullable | Token expiration |
| `calendarId` | varchar(255) | default `primary` | Target calendar |
| `createdAt` | timestamp | NOT NULL | — |
| `updatedAt` | timestamp | NOT NULL | — |

### 2.9 `payments` — Pagos

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | int | PK, auto-increment | Payment ID |
| `visitId` | int | nullable, FK → visits.id | Linked visit |
| `appointmentId` | int | nullable, FK → appointments.id | Linked appointment |
| `ownerId` | int | NOT NULL, FK → owners.id | Paying owner |
| `amount` | decimal(10,2) | NOT NULL | Amount |
| `currency` | varchar(10) | NOT NULL, default `ARS` | Currency code |
| `method` | enum(`efectivo`, `transferencia`, `otro`) | NOT NULL | Payment method |
| `status` | enum(`pagado`, `pendiente`, `parcial`) | NOT NULL, default `pendiente` | Payment status |
| `paidAt` | timestamp | nullable | Date paid |
| `description` | text | nullable | Description |
| `notes` | text | nullable | Notes |
| `createdAt` | timestamp | NOT NULL | — |
| `updatedAt` | timestamp | NOT NULL | — |

### 2.10 `whatsapp_conversations` — WhatsApp Conversations

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | int | PK, auto-increment | Conversation ID |
| `waId` | varchar(50) | NOT NULL | WhatsApp phone number |
| `contactName` | varchar(255) | nullable | Contact display name from WhatsApp |
| `ownerId` | int | nullable, FK → owners.id | Auto-matched or manually linked owner |
| `status` | enum(`active`, `closed`, `archived`) | NOT NULL, default `active` | Conversation state |
| `lastMessageAt` | timestamp | nullable | Last message timestamp |
| `aiEnabled` | boolean | NOT NULL, default true | Per-conversation AI toggle |
| `createdAt` | timestamp | NOT NULL | — |
| `updatedAt` | timestamp | NOT NULL | — |

### 2.11 `whatsapp_messages` — WhatsApp Message Log

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | int | PK, auto-increment | Message ID |
| `conversationId` | int | NOT NULL, FK → whatsapp_conversations.id | Parent conversation |
| `waMessageId` | varchar(255) | nullable | Meta message ID |
| `direction` | enum(`incoming`, `outgoing`) | NOT NULL | Message direction |
| `messageType` | varchar(50) | NOT NULL, default `text` | Type (text, interactive, button_reply, list_reply) |
| `body` | text | nullable | Message body text |
| `metadata` | text | nullable | JSON metadata for interactive messages |
| `status` | enum(`sent`, `delivered`, `read`, `failed`, `received`) | NOT NULL, default `sent` | Delivery status |
| `aiGenerated` | boolean | NOT NULL, default false | Whether AI generated this message |
| `createdAt` | timestamp | NOT NULL | — |

### 2.12 `whatsapp_settings` — WhatsApp Global Configuration

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | int | PK, auto-increment | Settings ID (singleton, always id=1) |
| `isActive` | boolean | NOT NULL, default false | Master on/off switch |
| `aiAutoReply` | boolean | NOT NULL, default true | Global AI auto-reply toggle |
| `businessName` | varchar(255) | default `Dra Branda Veterinaria` | Business name used in AI prompts |
| `welcomeMessage` | text | nullable | Welcome message for new conversations |
| `outsideHoursMessage` | text | nullable | Auto-reply outside business hours |
| `businessHoursStart` | varchar(5) | default `09:00` | Business hours start (HH:mm) |
| `businessHoursEnd` | varchar(5) | default `18:00` | Business hours end (HH:mm) |
| `workDays` | varchar(20) | default `1,2,3,4,5` | Working days (0=Sun, 1=Mon, ..., 6=Sat) |
| `quickReplies` | text | nullable | JSON array of `{id, title, body}` quick reply templates |
| `createdAt` | timestamp | NOT NULL | — |
| `updatedAt` | timestamp | NOT NULL | — |

---

## 3. Features Completed

### Core Clinical System
1. **Dashboard** — Home page with today's appointments, pending payments, recent visits, and summary statistics (owners count, pets count, monthly revenue).
2. **Patient Management (Pacientes)** — Full CRUD for pets with smart search across pet name, owner name, breed, and species filter chips.
3. **Patient Profile** — Rich profile page showing pet info, owner details, last visit, last payment, visit count, vaccination history, and clinical history entries.
4. **New Patient Form** — Full-page form with searchable owner combobox (with inline "create new owner" option), comprehensive onboarding fields (environment, diet, allergies, medical background, deworming).
5. **Owner Management (Familiares)** — Full CRUD for pet owners with name, phone, email, address, and notes.
6. **Clinical History (Visitas)** — Full CRUD for clinical visits with professional veterinary fields: physical exam (weight, temperature, heart rate, respiratory rate, body condition, mucosas, hydration, lymph nodes, dental status), diagnosis, treatment, medications, next steps, and free-text notes.
7. **Visit Attachments** — File upload to S3 per visit with viewer (images, PDFs, documents).
8. **Voice Recording & AI Transcription** — Record audio during visits, upload to S3, transcribe with Whisper (Spanish), then LLM extracts structured clinical fields (diagnosis, treatment, vitals, etc.) and auto-fills the visit form.
9. **Vaccination Tracking** — Full CRUD for vaccinations per pet with dose tracking, next dose scheduling, and dashboard alerts for overdue/upcoming vaccines (7-day window).
10. **Appointment Management (Turnos)** — Full CRUD for appointments with calendar views (monthly/weekly/list), status management (pendiente/confirmado/completado/cancelado), and support for both registered and unregistered clients.
11. **Public Booking Request** — Public (unauthenticated) endpoint for clients to request appointments.
12. **Financial Management (Finanzas)** — Full CRUD for payments with status tracking (pagado/pendiente/parcial), payment method (efectivo/transferencia/otro), monthly summary, and pending payment indicators.
13. **Statistics Page** — Placeholder "Coming Soon" page for future analytics.

### Integrations
14. **Google Calendar Sync** — OAuth2 connection, automatic event creation/update/deletion when appointments change, visual sync status per appointment.
15. **WhatsApp Business API** — Webhook endpoints, AI-powered auto-replies in Argentine Spanish, appointment slot suggestions, patient/owner context awareness, business hours enforcement, and admin management panel (see Section 8 for details).

### Administration
16. **User Management (Admin Panel)** — Admin-only CRUD for system users: create users with email/password, change passwords, toggle active/inactive, assign roles (admin/user), with self-protection guards (cannot delete/deactivate/demote self).
17. **Email/Password Login** — Dedicated `/login` page for users created by admin (non-OAuth users). Session cookie with 1-year expiry.
18. **Role-Based Access Control** — Three procedure levels: `publicProcedure` (no auth), `protectedProcedure` (any authenticated user), `adminProcedure` (admin role only). Deactivated users are blocked at the authentication middleware level.
19. **Auto Admin Promotion** — The project owner (identified by `OWNER_OPEN_ID`) is automatically promoted to admin role on first OAuth login.

### UI/UX
20. **Responsive Dashboard Layout** — Collapsible/resizable sidebar with persistent width in localStorage, mobile top bar with route labels, user dropdown with logout.
21. **Branding** — Custom logo (galgo + cat), favicon, "Dra Branda" branding throughout sidebar and login page.
22. **Spanish UI** — Entire interface in Argentine Spanish (vos/tenés/podés).
23. **Light Theme** — Default light theme with teal/green professional color palette, Inter + Nunito typography via Google Fonts.
24. **Seed Data** — 12 Argentine families, 23 pets, 16 visits, 11 appointments, 19 vaccinations, 17 payments pre-loaded for testing.

---

## 4. API Routes

### 4.1 Non-tRPC HTTP Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/oauth/callback` | Public | Manus OAuth callback — exchanges code for session token, sets cookie, redirects |
| POST | `/api/auth/login` | Public | Email/password login — validates credentials, returns user info, sets session cookie |
| GET | `/api/google/callback` | Public | Google Calendar OAuth callback — exchanges code for tokens, stores in DB, redirects to `/turnos` |
| GET | `/api/whatsapp/webhook` | Public | Meta webhook verification — validates `hub.verify_token`, echoes `hub.challenge` |
| POST | `/api/whatsapp/webhook` | Public | Meta webhook delivery — receives incoming messages, processes asynchronously |

### 4.2 tRPC Procedures (all under `/api/trpc`)

#### Auth Router (`auth.*`)

| Procedure | Type | Auth Level | Description |
|---|---|---|---|
| `auth.me` | query | public | Returns current authenticated user or null |
| `auth.logout` | mutation | public | Clears session cookie |

#### System Router (`system.*`)

| Procedure | Type | Auth Level | Description |
|---|---|---|---|
| `system.health` | query | public | Health check, returns `{ ok: true }` |
| `system.notifyOwner` | mutation | admin | Sends notification to project owner |

#### Owners Router (`owners.*`)

| Procedure | Type | Auth Level | Input | Description |
|---|---|---|---|---|
| `owners.list` | query | protected | `{ search?: string }` | List all owners, optional search by name/phone/email |
| `owners.getById` | query | protected | `{ id: number }` | Get single owner |
| `owners.create` | mutation | protected | `{ name, phone?, email?, address?, notes? }` | Create owner |
| `owners.update` | mutation | protected | `{ id, name?, phone?, email?, address?, notes? }` | Update owner |
| `owners.delete` | mutation | protected | `{ id: number }` | Delete owner |

#### Pets Router (`pets.*`)

| Procedure | Type | Auth Level | Input | Description |
|---|---|---|---|---|
| `pets.list` | query | protected | `{ ownerId?: number }` | List pets, optionally filtered by owner |
| `pets.search` | query | protected | `{ query?: string, species?: string }` | Smart search across pet name, owner name, breed; species filter |
| `pets.getProfile` | query | protected | `{ id: number }` | Rich profile with owner, last visit, last payment, visit count, all extended fields |
| `pets.getById` | query | protected | `{ id: number }` | Basic pet + owner info |
| `pets.getSpecies` | query | protected | — | List all unique species for filter chips |
| `pets.create` | mutation | protected | Full pet object (30+ fields) | Create pet with all onboarding fields |
| `pets.update` | mutation | protected | Partial pet object | Update pet fields |
| `pets.delete` | mutation | protected | `{ id: number }` | Delete pet |
| `pets.getUploadUrl` | mutation | protected | `{ fileName, mimeType }` | Generate S3 key for photo upload |
| `pets.uploadPhoto` | mutation | protected | `{ petId, fileName, mimeType, fileBase64 }` | Upload photo to S3, update pet record |

#### Visits Router (`visits.*`)

| Procedure | Type | Auth Level | Input | Description |
|---|---|---|---|---|
| `visits.listByPet` | query | protected | `{ petId: number }` | List visits for a pet, ordered by date desc |
| `visits.listRecent` | query | protected | `{ limit?: number }` | Recent visits with pet/owner names |
| `visits.getById` | query | protected | `{ id: number }` | Visit detail with attachments |
| `visits.create` | mutation | protected | Full visit object (20+ fields) | Create visit with all clinical fields |
| `visits.update` | mutation | protected | Partial visit object | Update visit fields |
| `visits.delete` | mutation | protected | `{ id: number }` | Delete visit and its attachments |
| `visits.uploadAttachment` | mutation | protected | `{ visitId, fileName, mimeType, fileSize?, fileBase64 }` | Upload file to S3, create attachment record |
| `visits.deleteAttachment` | mutation | protected | `{ id: number }` | Delete attachment record |
| `visits.getAttachments` | query | protected | `{ visitId: number }` | List attachments for a visit |

#### Appointments Router (`appointments.*`)

| Procedure | Type | Auth Level | Input | Description |
|---|---|---|---|---|
| `appointments.list` | query | protected | `{ from?, to?, status? }` | List appointments with filters |
| `appointments.getToday` | query | protected | — | Today's appointments |
| `appointments.getById` | query | protected | `{ id: number }` | Single appointment |
| `appointments.create` | mutation | protected | Full appointment object | Create appointment |
| `appointments.updateStatus` | mutation | protected | `{ id, status, notes? }` | Update appointment status |
| `appointments.update` | mutation | protected | Partial appointment object | Update appointment fields |
| `appointments.delete` | mutation | protected | `{ id: number }` | Delete appointment |
| `appointments.requestBooking` | mutation | **public** | `{ clientName, clientPhone, clientEmail?, petName, petSpecies, preferredDate, reason?, address? }` | Public booking request (creates pendiente appointment) |

#### Payments Router (`payments.*`)

| Procedure | Type | Auth Level | Input | Description |
|---|---|---|---|---|
| `payments.list` | query | protected | `{ status?, ownerId?, from?, to?, limit? }` | List payments with filters |
| `payments.getPending` | query | protected | — | All pending payments |
| `payments.getSummary` | query | protected | — | Monthly paid total + pending total |
| `payments.getById` | query | protected | `{ id: number }` | Single payment |
| `payments.create` | mutation | protected | `{ ownerId, visitId?, appointmentId?, amount, method, status, description?, notes?, paidAt? }` | Create payment |
| `payments.update` | mutation | protected | Partial payment object | Update payment (auto-sets paidAt when status=pagado) |
| `payments.delete` | mutation | protected | `{ id: number }` | Delete payment |

#### Dashboard Router (`dashboard.*`)

| Procedure | Type | Auth Level | Description |
|---|---|---|---|
| `dashboard.getSummary` | query | protected | Aggregated dashboard: today's appointments, pending payments, recent visits, monthly stats |

#### Vaccinations Router (`vaccinations.*`)

| Procedure | Type | Auth Level | Input | Description |
|---|---|---|---|---|
| `vaccinations.listByPet` | query | protected | `{ petId: number }` | List vaccinations for a pet |
| `vaccinations.getAlerts` | query | protected | — | Overdue vaccines + upcoming (next 7 days) |
| `vaccinations.create` | mutation | protected | Full vaccination object | Create vaccination record |
| `vaccinations.update` | mutation | protected | Partial vaccination object | Update vaccination |
| `vaccinations.delete` | mutation | protected | `{ id: number }` | Delete vaccination |

#### Voice Router (`voice.*`)

| Procedure | Type | Auth Level | Input | Description |
|---|---|---|---|---|
| `voice.processAudio` | mutation | protected | `{ audioBase64, mimeType?, petName?, ownerName? }` | Upload audio to S3, transcribe with Whisper, extract clinical fields with LLM |

#### Google Calendar Router (`googleCalendar.*`)

| Procedure | Type | Auth Level | Input | Description |
|---|---|---|---|---|
| `googleCalendar.status` | query | protected | — | Check if Google Calendar is connected |
| `googleCalendar.getAuthUrl` | mutation | protected | `{ origin: string }` | Get Google OAuth URL |
| `googleCalendar.disconnect` | mutation | protected | — | Remove Google Calendar tokens |
| `googleCalendar.syncAppointment` | mutation | protected | `{ appointmentId, origin }` | Create/sync appointment to Google Calendar |
| `googleCalendar.updateAppointment` | mutation | protected | `{ appointmentId, origin }` | Update synced event |
| `googleCalendar.deleteAppointment` | mutation | protected | `{ googleEventId, origin }` | Delete synced event |

#### Admin Users Router (`adminUsers.*`)

| Procedure | Type | Auth Level | Input | Description |
|---|---|---|---|---|
| `adminUsers.list` | query | admin | — | List all users (excludes passwordHash) |
| `adminUsers.getById` | query | admin | `{ id: number }` | Get single user |
| `adminUsers.create` | mutation | admin | `{ name, email, password, role? }` | Create user with email/password (checks email uniqueness) |
| `adminUsers.update` | mutation | admin | `{ id, name?, email?, role?, isActive? }` | Update user (self-protection guards) |
| `adminUsers.changePassword` | mutation | admin | `{ id, newPassword }` | Change any user's password (min 6 chars) |
| `adminUsers.delete` | mutation | admin | `{ id: number }` | Delete user (cannot delete self) |

#### WhatsApp Router (`whatsapp.*`)

| Procedure | Type | Auth Level | Input | Description |
|---|---|---|---|---|
| `whatsapp.getSettings` | query | admin | — | Get WhatsApp settings + configuration status |
| `whatsapp.updateSettings` | mutation | admin | Partial settings object | Update WhatsApp configuration |
| `whatsapp.listConversations` | query | protected | `{ search?, status?, limit?, offset? }` | List conversations with last message and unread count |
| `whatsapp.getMessages` | query | protected | `{ conversationId, limit?, offset? }` | Get messages for a conversation |
| `whatsapp.sendMessage` | mutation | protected | `{ conversationId, body }` | Send manual message via WhatsApp API |
| `whatsapp.toggleAI` | mutation | protected | `{ conversationId, aiEnabled }` | Toggle AI auto-reply per conversation |
| `whatsapp.linkOwner` | mutation | admin | `{ conversationId, ownerId }` | Link conversation to an owner |
| `whatsapp.updateConversationStatus` | mutation | protected | `{ conversationId, status }` | Archive/close/reopen conversation |
| `whatsapp.getStats` | query | protected | — | WhatsApp statistics (total/active conversations, total/AI messages) |

---

## 5. Frontend Pages

| Route | Component | Auth Required | Description |
|---|---|---|---|
| `/login` | `LoginEmail` | No | Email/password login form for non-OAuth users. Links to Manus OAuth login as alternative. |
| `/` | `Dashboard` | Yes | Home dashboard: stat cards (appointments today, pending payments, familiares, pacientes), today's appointments list, pending payments list, recent visits list. |
| `/pacientes` | `Mascotas` | Yes | Patient database: search bar, species filter chips, patient cards with photo/name/species/breed/owner. Link to create new patient. |
| `/pacientes/nuevo` | `NuevoPaciente` | Yes | Full-page new patient form: searchable owner combobox with inline creation, comprehensive pet fields (basic info, environment, diet, medical background, deworming). |
| `/pacientes/:id` | `MascotaDetalle` | Yes | Patient profile: header with photo/name/species, owner info, patient type badge, clinical history entries (inline), vaccination list, last payment, edit capabilities. |
| `/pacientes/:id/nueva-visita` | `NuevaVisita` | Yes | New visit form: auto-filled date/time, voice recording button with AI transcription, physical exam fields, clinical fields, file attachments. |
| `/visita/:id` | `VisitaDetalle` | Yes | Visit detail view: all clinical data, audio playback, transcription, file attachments with viewer. |
| `/turnos` | `Turnos` | Yes | Appointment management: calendar views (month/week/list), create/edit appointment dialog, status management, Google Calendar sync controls. |
| `/finanzas` | `Finanzas` | Yes | Financial management: payment list with status filters, create/edit payment dialog, summary indicators (monthly paid, pending total). |
| `/estadisticas` | `Estadisticas` | Yes | Placeholder "Coming Soon" page. |
| `/admin/usuarios` | `AdminUsuarios` | Yes (admin) | User management: user list table, create user dialog, edit user dialog, change password dialog, activate/deactivate toggle, delete with confirmation. |
| `/admin/whatsapp` | `AdminWhatsApp` | Yes (admin) | WhatsApp admin: 3 tabs — Chats (conversation list + message panel + manual send), Configuración (connection status, AI toggle, business hours, quick replies CRUD), Estadísticas (conversation/message/AI counts). |
| `/404` | `NotFound` | Yes | 404 page with "Go Home" button. |

**Unused/Legacy Pages** (exist in `/pages/` but not routed in App.tsx):
- `Home.tsx` — Original template home page (replaced by Dashboard)
- `Propietarios.tsx` — Standalone owners list (merged into Pacientes)
- `PropietarioDetalle.tsx` — Standalone owner detail (merged into patient profile)
- `Historial.tsx` — Standalone clinical history (merged into patient profile)
- `ComponentShowcase.tsx` — UI component showcase/demo page

---

## 6. Authentication & Roles

### Authentication Methods

The application supports two authentication methods:

**Manus OAuth (Primary):** The default login method. Users click "Iniciar sesión" on the unauthenticated screen, which redirects to the Manus OAuth portal. After successful authentication, the callback at `/api/oauth/callback` creates or updates the user record and sets a session cookie (`app_session_id`) with a 1-year expiry. The project owner (identified by `OWNER_OPEN_ID` environment variable) is automatically assigned the `admin` role on first login.

**Email/Password (Secondary):** For users created by an admin through the user management panel. These users log in at `/login` with their email and password. The server validates credentials against the bcrypt hash stored in the `passwordHash` column, checks that the account is active (`isActive = true`), and sets the same session cookie. Inactive users receive a 403 error with the message "Tu cuenta está desactivada."

### Session Management

Sessions are JWT-based tokens stored in an HTTP cookie named `app_session_id`. The cookie is configured with `httpOnly`, `secure` (in production), `sameSite: lax`, and a 1-year `maxAge`. The server resolves the current user from the cookie on every request via `server/_core/context.ts`, which calls `authenticateRequest` from `server/_core/sdk.ts`. Deactivated users are blocked at the authentication middleware level — even with a valid JWT, if `isActive` is false, the user is treated as unauthenticated.

### Roles

| Role | Access Level | Description |
|---|---|---|
| `admin` | Full access | Can access all features plus admin panel (user management, WhatsApp settings). Can create/edit/delete users, change passwords, assign roles. |
| `user` | Standard access | Can access all clinical features (patients, visits, appointments, payments, vaccinations, voice recording). Cannot access admin panel or admin-only procedures. |

### Procedure Authorization Levels

| Level | Middleware | Behavior |
|---|---|---|
| `publicProcedure` | None | No authentication required. Used for `auth.me`, `auth.logout`, `system.health`, `appointments.requestBooking`. |
| `protectedProcedure` | `requireUser` | Requires valid session cookie with active user. Returns UNAUTHORIZED (10001) if not authenticated. |
| `adminProcedure` | `requireUser` + role check | Requires admin role. Returns FORBIDDEN (10002) if user is not admin. |

### Admin Self-Protection Guards

The admin user management system includes several self-protection mechanisms to prevent accidental lockout:
- An admin cannot delete their own account.
- An admin cannot deactivate their own account (`isActive = false`).
- An admin cannot remove their own admin role (change role from `admin` to `user`).

---

## 7. WhatsApp Integration Status

### What Is Built

The WhatsApp Business API integration is fully implemented at the code level. The following components are complete and ready to go live once Meta credentials are configured:

**Webhook Endpoints:**
- `GET /api/whatsapp/webhook` — Meta verification endpoint that validates `hub.verify_token` against `WHATSAPP_VERIFY_TOKEN` and echoes the challenge.
- `POST /api/whatsapp/webhook` — Incoming message handler that returns `EVENT_RECEIVED` immediately and processes the payload asynchronously.

**Cloud API Integration (Meta Graph API v25):**
- `sendWhatsAppText(to, body)` — Send plain text messages.
- `sendWhatsAppInteractiveButtons(to, bodyText, buttons)` — Send interactive button messages (up to 3 buttons, 20-char limit per title).
- `sendWhatsAppInteractiveList(to, bodyText, buttonText, sections)` — Send interactive list messages.
- `markMessageAsRead(messageId)` — Mark incoming messages as read.

**AI Response Engine:**
- System prompt in Argentine Spanish with veterinary context.
- Rules: short answers (3-4 sentences), no medical diagnoses, emergency escalation, moderate emoji use.
- Context-aware: includes linked owner/pet data, upcoming appointments, and available appointment slots.
- Conversation history: last 10 messages are included in the LLM context.
- Business hours enforcement: sends `outsideHoursMessage` outside configured hours.
- Per-conversation and global AI toggle.

**Appointment Management via Chat:**
- Available slot computation: generates weekday hourly slots (09:00-18:00) for the next 7 days, excluding busy slots.
- Slot suggestions are included in the AI system prompt for natural conversation flow.
- The AI is instructed to collect: owner name, pet name/species, reason, and address before booking.

**Owner/Patient Matching:**
- Auto-matches incoming WhatsApp numbers to existing owners by comparing the last 8 digits of the phone number.
- Admin can manually link/unlink conversations to owners.

**Admin UI (3 tabs):**
- **Chats:** Conversation list with search, unread counts, last message preview. Message panel with full history. Manual message sending. Per-conversation AI toggle.
- **Configuración:** Connection status indicator, webhook URL display, AI auto-reply toggle, business name, welcome message, outside-hours message, business hours (start/end), work days, quick replies CRUD.
- **Estadísticas:** Total conversations, active conversations, total messages, AI-generated messages.

### What Needs Meta Credentials to Go Live

The integration requires three environment variables to be configured in Settings > Secrets:

| Secret | Description | How to Obtain |
|---|---|---|
| `WHATSAPP_ACCESS_TOKEN` | Permanent access token for the WhatsApp Business API | Meta Business Manager → System Users → Generate Token |
| `WHATSAPP_PHONE_NUMBER_ID` | The phone number ID registered in WhatsApp Business | Meta Developer Portal → WhatsApp → Phone Numbers |
| `WHATSAPP_VERIFY_TOKEN` | Custom string for webhook verification | You choose any string; must match what you set in Meta webhook config |

Additionally, `WHATSAPP_BUSINESS_ACCOUNT_ID` is defined in the env but not currently used in the code.

**Meta Developer Portal Setup Required:**
1. Create a Meta App at developers.facebook.com.
2. Add the WhatsApp product.
3. Configure the webhook URL to `https://vetapp-juil9ung.manus.space/api/whatsapp/webhook`.
4. Subscribe to the `messages` webhook field.
5. Set the verify token to match `WHATSAPP_VERIFY_TOKEN`.
6. Generate a permanent access token.
7. Register and verify a phone number.

### Hardcoded Defaults

The following values are hardcoded as defaults in `whatsappService.ts` and created on first access to the `whatsapp_settings` table:
- Business name: `"Dra Branda Veterinaria"`
- Welcome message: `"¡Hola! 🐾 Bienvenido/a a Dra Branda Veterinaria a Domicilio. ¿En qué puedo ayudarte?"`
- Outside hours message: `"Gracias por escribirnos. En este momento estamos fuera de horario de atención. Te responderemos a la brevedad. 🕐"`
- Quick replies: Pedir turno, Consulta, Emergencia
- Business hours: 09:00-18:00, Monday-Friday
- Available slots: 1-hour blocks, 9am-6pm, weekdays only, next 7 days

All of these can be changed through the admin UI after initial setup.

---

## 8. Tests

**Total: 39 tests across 4 test files, all passing.**

| Test File | Tests | Coverage |
|---|---|---|
| `server/auth.logout.test.ts` | 1 | Auth logout clears session cookie |
| `server/vetapp.test.ts` | 10 | Core routers: owners.create, owners.list, pets.create, visits.create, visits.listRecent, appointments.create, appointments.updateStatus, payments.create, payments.list, dashboard.getSummary |
| `server/adminUsers.test.ts` | 12 | Admin access control: non-admin rejection (list, create, changePassword, delete), admin can list, self-protection (cannot delete self, deactivate self, remove own admin role), input validation (empty name, invalid email, short password) |
| `server/whatsapp.test.ts` | 16 | Admin settings access, unauthorized rejection, conversation listing, stats query, module exports (processWebhook, sendWhatsAppText, sendWhatsAppInteractiveButtons, getOrCreateConversation, generateAIResponse, getSettings), webhook payload handling (invalid objects, empty entries) |

**Test Infrastructure:** All tests use Vitest with mocked database (`getDb` returns chainable fake query builders). Tests create mock tRPC contexts with admin/user/anonymous callers. No integration tests against a real database.

**Not Covered by Tests:**
- Frontend components (no React testing)
- Google Calendar integration
- Voice transcription/LLM extraction
- File upload to S3
- WhatsApp Cloud API actual HTTP calls
- Email/password login flow (`/api/auth/login`)

---

## 9. Known Issues & TODOs

### Incomplete or Placeholder Features
- **Estadísticas page** is a "Coming Soon" placeholder with no actual analytics or charts.
- **NotFound page** has English text ("Page Not Found", "Sorry, the page...") while the rest of the app is in Spanish.

### Unused/Legacy Files
- `client/src/pages/Home.tsx` — Original template home page, not routed.
- `client/src/pages/Propietarios.tsx` — Standalone owners list, not routed (merged into Pacientes).
- `client/src/pages/PropietarioDetalle.tsx` — Standalone owner detail, not routed.
- `client/src/pages/Historial.tsx` — Standalone clinical history, not routed.
- `client/src/pages/ComponentShowcase.tsx` — UI component showcase, not routed.

### Typo in Code
- In `server/routers/voice.ts`, the LLM extraction schema uses `mucpiosas` instead of `mucosas` (line 75 and 116). This typo means the extracted field name does not match the database column name, potentially causing the mucosas field to not auto-fill from voice recordings.

### Architecture Observations
- **No multi-tenancy:** All data is shared in a single tenant. All authenticated users see all patients, visits, appointments, and payments. There is no data isolation between users.
- **No audit trail:** No logging of who created/modified/deleted records. The `updatedAt` timestamp tracks when but not who.
- **No pagination on main lists:** Owners, pets, visits, and payments lists load all records. The pets search has a `LIMIT 50`, and payments list defaults to 50, but other lists have no limit.
- **No cascading deletes in application code:** Deleting an owner does not delete their pets, visits, or payments. Deleting a pet does not delete its visits or vaccinations. Only visit deletion cascades to visit attachments.
- **WhatsApp appointment creation:** The AI suggests available slots and collects information, but does not actually create appointment records in the database. The appointment creation must be done manually by the admin after receiving the information via WhatsApp.
- **Google Calendar tokens stored in plaintext:** Access tokens and refresh tokens are stored as plain text in the `google_tokens` table.
- **50MB body limit:** The Express server accepts JSON payloads up to 50MB, which is necessary for base64 file uploads but could be a concern for abuse if exposed publicly without rate limiting.
- **No rate limiting:** No rate limiting on any endpoint, including the public booking request and login endpoints.

### Environment Variable Note
- `WHATSAPP_BUSINESS_ACCOUNT_ID` is defined in `server/_core/env.ts` but is not referenced anywhere in the codebase.

---

## 10. Environment Variables Required

### System Variables (Auto-Injected by Manus Platform)

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | MySQL/TiDB connection string | Yes |
| `JWT_SECRET` | Session cookie signing secret | Yes |
| `VITE_APP_ID` | Manus OAuth application ID | Yes |
| `OAUTH_SERVER_URL` | Manus OAuth backend base URL | Yes |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL (frontend) | Yes |
| `OWNER_OPEN_ID` | Project owner's OpenID (auto-promoted to admin) | Yes |
| `OWNER_NAME` | Project owner's display name | Yes |
| `BUILT_IN_FORGE_API_URL` | Manus built-in APIs URL (LLM, storage, transcription, etc.) | Yes |
| `BUILT_IN_FORGE_API_KEY` | Bearer token for Manus built-in APIs (server-side) | Yes |
| `VITE_FRONTEND_FORGE_API_KEY` | Bearer token for frontend access to Manus APIs | Yes |
| `VITE_FRONTEND_FORGE_API_URL` | Manus built-in APIs URL for frontend | Yes |
| `VITE_APP_TITLE` | Application title displayed in browser tab | Yes |
| `VITE_APP_LOGO` | Application logo URL | Yes |
| `VITE_ANALYTICS_ENDPOINT` | Analytics endpoint URL | Optional |
| `VITE_ANALYTICS_WEBSITE_ID` | Analytics website ID | Optional |
| `PORT` | Server port (defaults to 3000) | Optional |
| `NODE_ENV` | Runtime environment (`development` or `production`) | Auto-set |

### Google Calendar Integration

| Variable | Description | Required |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth2 Client ID | Yes (for Calendar sync) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 Client Secret | Yes (for Calendar sync) |

### WhatsApp Business API

| Variable | Description | Required |
|---|---|---|
| `WHATSAPP_ACCESS_TOKEN` | Meta Graph API permanent access token | Yes (for WhatsApp) |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business phone number ID | Yes (for WhatsApp) |
| `WHATSAPP_VERIFY_TOKEN` | Custom webhook verification token | Yes (for WhatsApp) |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | WhatsApp Business Account ID | Defined but unused |
