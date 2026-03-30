import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { appointments, payments, visits, pets, owners } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, count, sum } from "drizzle-orm";

export const dashboardRouter = router({
  getSummary: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB no disponible");

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Today's appointments
    const todayAppointments = await db
      .select({
        id: appointments.id,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
        reason: appointments.reason,
        address: appointments.address,
        clientName: appointments.clientName,
        petName: appointments.petName,
        petSpecies: appointments.petSpecies,
        ownerId: appointments.ownerId,
        petId: appointments.petId,
        ownerName: owners.name,
        ownerPhone: owners.phone,
        linkedPetName: pets.name,
      })
      .from(appointments)
      .leftJoin(owners, eq(appointments.ownerId, owners.id))
      .leftJoin(pets, eq(appointments.petId, pets.id))
      .where(
        and(
          gte(appointments.startTime, startOfDay),
          lte(appointments.startTime, endOfDay)
        )
      )
      .orderBy(appointments.startTime);

    // Pending payments
    const pendingPayments = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        currency: payments.currency,
        description: payments.description,
        createdAt: payments.createdAt,
        ownerName: owners.name,
      })
      .from(payments)
      .leftJoin(owners, eq(payments.ownerId, owners.id))
      .where(eq(payments.status, "pendiente"))
      .orderBy(desc(payments.createdAt))
      .limit(5);

    // Recent visits
    const recentVisits = await db
      .select({
        id: visits.id,
        visitDate: visits.visitDate,
        reason: visits.reason,
        diagnosis: visits.diagnosis,
        petName: pets.name,
        petSpecies: pets.species,
        ownerName: owners.name,
      })
      .from(visits)
      .leftJoin(pets, eq(visits.petId, pets.id))
      .leftJoin(owners, eq(visits.ownerId, owners.id))
      .orderBy(desc(visits.visitDate))
      .limit(5);

    // Monthly stats
    const [monthlyPaid] = await db
      .select({ total: sum(payments.amount), qty: count() })
      .from(payments)
      .where(and(eq(payments.status, "pagado"), gte(payments.createdAt, startOfMonth)));

    const [pendingCount] = await db
      .select({ qty: count() })
      .from(payments)
      .where(eq(payments.status, "pendiente"));

    const [totalOwners] = await db.select({ qty: count() }).from(owners);
    const [totalPets] = await db.select({ qty: count() }).from(pets);

    return {
      todayAppointments,
      pendingPayments,
      recentVisits,
      stats: {
        monthPaid: monthlyPaid?.total ?? "0",
        pendingCount: pendingCount?.qty ?? 0,
        totalOwners: totalOwners?.qty ?? 0,
        totalPets: totalPets?.qty ?? 0,
      },
    };
  }),
});
