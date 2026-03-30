import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { transcribeAudio } from "../_core/voiceTranscription";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

export const voiceRouter = router({
  /**
   * Upload audio (base64) to S3, transcribe with Whisper, then use LLM to extract clinical fields
   */
  processAudio: protectedProcedure
    .input(z.object({
      audioBase64: z.string(),
      mimeType: z.string().default("audio/webm"),
      petName: z.string().optional(),
      ownerName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // 1. Upload audio to S3
      const ext = input.mimeType.includes("webm") ? "webm" : 
                  input.mimeType.includes("mp4") ? "m4a" :
                  input.mimeType.includes("ogg") ? "ogg" : "webm";
      const fileKey = `audio/visit-${nanoid(10)}.${ext}`;
      const audioBuffer = Buffer.from(input.audioBase64, "base64");
      
      // Check size (16MB limit for Whisper)
      const sizeMB = audioBuffer.length / (1024 * 1024);
      if (sizeMB > 16) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `El audio es demasiado grande (${sizeMB.toFixed(1)}MB). El máximo es 16MB.`,
        });
      }

      const { url: audioUrl } = await storagePut(fileKey, audioBuffer, input.mimeType);

      // 2. Transcribe with Whisper
      const transcriptionResult = await transcribeAudio({
        audioUrl,
        language: "es",
        prompt: "Transcripción de consulta veterinaria a domicilio. La veterinaria describe el examen clínico del paciente, diagnóstico, tratamiento y medicación.",
      });

      if ("error" in transcriptionResult) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error de transcripción: ${transcriptionResult.error}`,
        });
      }

      const transcription = transcriptionResult.text;

      // 3. Use LLM to extract structured clinical fields from transcription
      const extractionResult = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Sos un asistente veterinario que extrae información clínica de transcripciones de consultas veterinarias a domicilio en Argentina.

Analizá la transcripción y extraé los campos clínicos que encuentres. Si un campo no se menciona, dejalo como null. No inventes datos.

Los campos posibles son:
- reason: motivo de consulta (string)
- diagnosis: diagnóstico (string)
- treatment: tratamiento indicado (string)
- medications: medicamentos recetados (string)
- nextSteps: próximos pasos o indicaciones de seguimiento (string)
- weight: peso en kg (number, ej: 5.2)
- temperature: temperatura en °C (number, ej: 38.5)
- heartRate: frecuencia cardíaca (string, ej: "120 lpm")
- respRate: frecuencia respiratoria (string, ej: "20 rpm")
- bodyCondition: condición corporal (string, ej: "3/5" o "normal")
- mucpiosas: estado de mucosas, solo uno de: "rosadas", "palidas", "ictericas", "cianoticas" (string o null)
- hydration: estado de hidratación, solo uno de: "normal", "leve", "moderada", "severa" (string o null)
- lymphNodes: ganglios linfáticos, solo uno de: "normal", "aumentados" (string o null)
- dentalStatus: estado dental, solo uno de: "bueno", "regular", "malo" (string o null)
- notes: cualquier otra observación relevante que no encaje en los campos anteriores (string)

Respondé SOLO con un objeto JSON válido. No agregues texto antes ni después del JSON.`
          },
          {
            role: "user",
            content: `Paciente: ${input.petName || "No especificado"}
Familiar: ${input.ownerName || "No especificado"}

Transcripción de la consulta:
"${transcription}"`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "clinical_extraction",
            strict: true,
            schema: {
              type: "object",
              properties: {
                reason: { type: ["string", "null"], description: "Motivo de consulta" },
                diagnosis: { type: ["string", "null"], description: "Diagnóstico" },
                treatment: { type: ["string", "null"], description: "Tratamiento" },
                medications: { type: ["string", "null"], description: "Medicamentos" },
                nextSteps: { type: ["string", "null"], description: "Próximos pasos" },
                weight: { type: ["number", "null"], description: "Peso en kg" },
                temperature: { type: ["number", "null"], description: "Temperatura en °C" },
                heartRate: { type: ["string", "null"], description: "Frecuencia cardíaca" },
                respRate: { type: ["string", "null"], description: "Frecuencia respiratoria" },
                bodyCondition: { type: ["string", "null"], description: "Condición corporal" },
                mucpiosas: { type: ["string", "null"], description: "Estado de mucosas" },
                hydration: { type: ["string", "null"], description: "Hidratación" },
                lymphNodes: { type: ["string", "null"], description: "Ganglios linfáticos" },
                dentalStatus: { type: ["string", "null"], description: "Estado dental" },
                notes: { type: ["string", "null"], description: "Otras observaciones" },
              },
              required: ["reason", "diagnosis", "treatment", "medications", "nextSteps", "weight", "temperature", "heartRate", "respRate", "bodyCondition", "mucpiosas", "hydration", "lymphNodes", "dentalStatus", "notes"],
              additionalProperties: false,
            },
          },
        },
      });

      let extractedFields: Record<string, unknown> = {};
      try {
        const content = extractionResult.choices[0]?.message?.content;
        if (typeof content === "string") {
          extractedFields = JSON.parse(content);
        }
      } catch {
        // If parsing fails, return transcription only
      }

      return {
        audioUrl,
        transcription,
        extractedFields,
      };
    }),
});
