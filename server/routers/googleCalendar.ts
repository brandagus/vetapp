import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getAuthUrl,
  getGoogleTokens,
  removeGoogleTokens,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "../googleCalendar";

export const googleCalendarRouter = router({
  // Check if user has Google Calendar connected
  status: protectedProcedure.query(async ({ ctx }) => {
    const tokens = await getGoogleTokens(ctx.user.id);
    return {
      connected: !!tokens,
      hasRefreshToken: !!tokens?.refreshToken,
    };
  }),

  // Get the Google OAuth URL to connect
  getAuthUrl: protectedProcedure
    .input(z.object({ origin: z.string() }))
    .mutation(({ ctx, input }) => {
      const redirectUri = `${input.origin}/api/google/callback`;
      const state = Buffer.from(
        JSON.stringify({ origin: input.origin, userId: ctx.user.id })
      ).toString("base64");
      const url = getAuthUrl(redirectUri, state);
      return { url };
    }),

  // Disconnect Google Calendar
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    await removeGoogleTokens(ctx.user.id);
    return { success: true };
  }),

  // Sync a single appointment to Google Calendar
  syncAppointment: protectedProcedure
    .input(z.object({ appointmentId: z.number(), origin: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const redirectUri = `${input.origin}/api/google/callback`;
      const result = await createCalendarEvent(
        ctx.user.id,
        input.appointmentId,
        redirectUri
      );
      return { success: !!result, eventId: result?.id ?? null };
    }),

  // Update a synced appointment in Google Calendar
  updateAppointment: protectedProcedure
    .input(z.object({ appointmentId: z.number(), origin: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const redirectUri = `${input.origin}/api/google/callback`;
      const result = await updateCalendarEvent(
        ctx.user.id,
        input.appointmentId,
        redirectUri
      );
      return { success: !!result };
    }),

  // Delete a synced appointment from Google Calendar
  deleteAppointment: protectedProcedure
    .input(z.object({ googleEventId: z.string(), origin: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const redirectUri = `${input.origin}/api/google/callback`;
      const result = await deleteCalendarEvent(
        ctx.user.id,
        input.googleEventId,
        redirectUri
      );
      return { success: result };
    }),
});
