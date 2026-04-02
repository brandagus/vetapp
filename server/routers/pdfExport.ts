import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { generatePatientPDF } from "../pdfExport";

export const pdfExportRouter = router({
  generatePatientHistory: protectedProcedure
    .input(z.object({ petId: z.number() }))
    .mutation(async ({ input }) => {
      const { url, key } = await generatePatientPDF(input.petId);
      return { url, key };
    }),
});
