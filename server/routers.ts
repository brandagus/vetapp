import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { ownersRouter } from "./routers/owners";
import { petsRouter } from "./routers/pets";
import { visitsRouter } from "./routers/visits";
import { appointmentsRouter } from "./routers/appointments";
import { paymentsRouter } from "./routers/payments";
import { dashboardRouter } from "./routers/dashboard";
import { googleCalendarRouter } from "./routers/googleCalendar";
import { vaccinationsRouter } from "./routers/vaccinations";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  owners: ownersRouter,
  pets: petsRouter,
  visits: visitsRouter,
  appointments: appointmentsRouter,
  payments: paymentsRouter,
  dashboard: dashboardRouter,
  googleCalendar: googleCalendarRouter,
  vaccinations: vaccinationsRouter,
});

export type AppRouter = typeof appRouter;
