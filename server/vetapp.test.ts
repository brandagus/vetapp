/**
 * VetApp — Server-side unit tests
 * Tests cover the core business logic of all feature routers.
 * Uses the same pattern as the reference auth.logout.test.ts
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Shared mock DB setup ────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";

const mockInsertResult = { insertId: 42 };

function buildMockDb(overrides: Record<string, unknown> = {}) {
  const base = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([mockInsertResult]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return base;
}

// ─── Auth context helper ─────────────────────────────────────────────────────

function createAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-open-id",
      email: "vet@example.com",
      name: "Dra. Rocío",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── Owners ──────────────────────────────────────────────────────────────────

describe("owners.create", () => {
  it("inserts a new owner and returns the id", async () => {
    const db = buildMockDb();
    vi.mocked(getDb).mockResolvedValue(db as any);

    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.owners.create({
      name: "María González",
      phone: "+54 11 1234-5678",
    });

    expect(result).toEqual({ id: 42 });
    expect(db.insert).toHaveBeenCalled();
  });
});

describe("owners.list", () => {
  it("returns an empty array when no owners exist", async () => {
    // owners.list returns `db.select().from().orderBy()` directly (no .limit)
    // so orderBy must be thenable and resolve to an array
    const chain: any = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.from = vi.fn().mockReturnValue(chain);
    chain.where = vi.fn().mockReturnValue(chain);
    chain.orderBy = vi.fn().mockResolvedValue([]);
    chain.limit = vi.fn().mockResolvedValue([]);
    vi.mocked(getDb).mockResolvedValue(chain as any);

    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.owners.list(undefined);
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Pets ─────────────────────────────────────────────────────────────────────

describe("pets.create", () => {
  it("inserts a new pet and returns the id", async () => {
    const db = buildMockDb();
    vi.mocked(getDb).mockResolvedValue(db as any);

    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.pets.create({
      ownerId: 1,
      name: "Firulais",
      species: "Perro",
    });

    expect(result).toEqual({ id: 42 });
    expect(db.insert).toHaveBeenCalled();
  });
});

// ─── Visits ───────────────────────────────────────────────────────────────────

describe("visits.create", () => {
  it("inserts a visit record and returns the id", async () => {
    const db = buildMockDb();
    vi.mocked(getDb).mockResolvedValue(db as any);

    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.visits.create({
      petId: 1,
      ownerId: 1,
      visitDate: new Date().toISOString(),
      reason: "Control anual",
    });

    expect(result).toEqual({ id: 42 });
  });
});

describe("visits.listRecent", () => {
  it("returns a list of recent visits with pet and owner info", async () => {
    const mockVisits = [
      {
        id: 1,
        visitDate: new Date(),
        reason: "Vacunación",
        diagnosis: null,
        petId: 1,
        petName: "Firulais",
        petSpecies: "Perro",
        ownerId: 1,
        ownerName: "María González",
      },
    ];
    const db = buildMockDb({ limit: vi.fn().mockResolvedValue(mockVisits) });
    vi.mocked(getDb).mockResolvedValue(db as any);

    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.visits.listRecent({ limit: 10 });

    expect(result).toHaveLength(1);
    expect(result[0]?.petName).toBe("Firulais");
  });
});

// ─── Appointments ─────────────────────────────────────────────────────────────

describe("appointments.create", () => {
  it("creates an appointment and returns the id", async () => {
    const db = buildMockDb();
    vi.mocked(getDb).mockResolvedValue(db as any);

    const caller = appRouter.createCaller(createAdminCtx());
    const startTime = new Date(Date.now() + 86400000).toISOString();
    const endTime = new Date(Date.now() + 86400000 + 3600000).toISOString();
    const result = await caller.appointments.create({
      clientName: "Juan Pérez",
      petName: "Luna",
      petSpecies: "Gato",
      startTime,
      endTime,
      status: "pendiente",
    });

    expect(result).toEqual({ id: 42 });
  });
});

describe("appointments.updateStatus", () => {
  it("updates the appointment status", async () => {
    const db = buildMockDb({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    });
    vi.mocked(getDb).mockResolvedValue(db as any);

    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.appointments.updateStatus({
      id: 1,
      status: "confirmado",
    });

    expect(result).toEqual({ success: true });
  });
});

// ─── Payments ─────────────────────────────────────────────────────────────────

describe("payments.create", () => {
  it("creates a payment record and returns the id", async () => {
    const db = buildMockDb();
    vi.mocked(getDb).mockResolvedValue(db as any);

    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.payments.create({
      ownerId: 1,
      amount: "5000",
      method: "efectivo",
      status: "pagado",
    });

    expect(result).toEqual({ id: 42 });
  });
});

describe("payments.list", () => {
  it("returns an empty list when no payments exist", async () => {
    const db = buildMockDb({ limit: vi.fn().mockResolvedValue([]) });
    vi.mocked(getDb).mockResolvedValue(db as any);

    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.payments.list(undefined);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

describe("dashboard.getSummary", () => {
  it("returns summary with stats, today appointments, pending payments, and recent visits", async () => {
    // Build a fully chainable mock where every method returns the same object
    // and the terminal awaitable methods resolve to arrays.
    const makeChain = (resolveValue: unknown[] = []): any => {
      const chain: any = {};
      const self = () => chain;
      chain.select = vi.fn().mockReturnValue(chain);
      chain.from = vi.fn().mockReturnValue(chain);
      chain.leftJoin = vi.fn().mockReturnValue(chain);
      chain.where = vi.fn().mockReturnValue(chain);
      chain.orderBy = vi.fn().mockReturnValue(chain);
      chain.limit = vi.fn().mockResolvedValue(resolveValue);
      // Make the chain itself awaitable (for `const [x] = await db.select()...`)
      chain.then = (resolve: (v: unknown[]) => void) => Promise.resolve(resolveValue).then(resolve);
      return chain;
    };

    const db: any = { select: vi.fn() };
    // Each call to db.select() returns a fresh fully-chainable mock
    db.select.mockImplementation(() => makeChain([{ total: "0", qty: 0 }]));

    vi.mocked(getDb).mockResolvedValue(db);

    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.dashboard.getSummary();

    expect(result).toHaveProperty("stats");
    expect(result).toHaveProperty("todayAppointments");
    expect(result).toHaveProperty("pendingPayments");
    expect(result).toHaveProperty("recentVisits");
  });
});
