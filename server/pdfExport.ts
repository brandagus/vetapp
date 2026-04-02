import PDFDocument from "pdfkit";
import { getDb } from "./db";
import { pets, owners, visits, vaccinations, visitAttachments } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

// ── Helpers ──
function fmtDate(d: unknown): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(String(d));
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(d: unknown): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(String(d));
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function calcAge(birthDate: unknown): string {
  if (!birthDate) return "Desconocida";
  const birth = birthDate instanceof Date ? birthDate : new Date(String(birthDate));
  if (isNaN(birth.getTime())) return "Desconocida";
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  if (years > 0) return `${years} año${years > 1 ? "s" : ""}`;
  if (months > 0) return `${months} mes${months > 1 ? "es" : ""}`;
  return "< 1 mes";
}

const labelMap: Record<string, string> = {
  interior: "Interior", exterior: "Exterior", mixto: "Mixto",
  balanceado: "Balanceado", casera: "Casera", mixta: "Mixta", barf: "BARF", otra: "Otra",
  si: "Sí", no: "No", no_se: "No sé",
  tranquilo: "Tranquilo", nervioso: "Nervioso", agresivo: "Agresivo", miedoso: "Miedoso", otro: "Otro",
  seguimiento: "Seguimiento", visita_unica: "Visita única",
  rosadas: "Rosadas", palidas: "Pálidas", ictericas: "Ictéricas", cianoticas: "Cianóticas",
  normal: "Normal", leve: "Leve", moderada: "Moderada", severa: "Severa",
  aumentados: "Aumentados",
  bueno: "Bueno", regular: "Regular", malo: "Malo",
  macho: "Macho", hembra: "Hembra", desconocido: "Desconocido",
};
function lbl(v: string | null | undefined): string { return v ? (labelMap[v] || v) : "—"; }

// ── Colors ──
const PRIMARY = "#0d7c66";
const DARK = "#1a1a1a";
const MUTED = "#666666";
const LIGHT_BG = "#f0faf7";
const BORDER = "#d0d0d0";

// ── Main export function ──
export async function generatePatientPDF(petId: number): Promise<{ url: string; key: string }> {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");

  // 1. Fetch all data
  const [pet] = await db.select().from(pets).where(eq(pets.id, petId)).limit(1);
  if (!pet) throw new Error("Paciente no encontrado");

  const [owner] = await db.select().from(owners).where(eq(owners.id, pet.ownerId)).limit(1);

  const visitsList = await db
    .select()
    .from(visits)
    .where(eq(visits.petId, petId))
    .orderBy(desc(visits.visitDate));

  const vaccinesList = await db
    .select()
    .from(vaccinations)
    .where(eq(vaccinations.petId, petId))
    .orderBy(desc(vaccinations.applicationDate));

  // Fetch attachments for all visits
  const visitIds = visitsList.map((v) => v.id);
  const allAttachments: Record<number, Array<{ fileName: string; fileUrl: string; mimeType: string | null }>> = {};
  for (const vid of visitIds) {
    const atts = await db
      .select({ fileName: visitAttachments.fileName, fileUrl: visitAttachments.fileUrl, mimeType: visitAttachments.mimeType })
      .from(visitAttachments)
      .where(eq(visitAttachments.visitId, vid));
    if (atts.length > 0) allAttachments[vid] = atts;
  }

  // 2. Create PDF
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: `Historial Clínico - ${pet.name}`,
      Author: "Dra Branda Veterinaria",
      Subject: "Historial Clínico Veterinario",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // ── Header ──
  function drawHeader() {
    doc.save();
    doc.rect(0, 0, doc.page.width, 80).fill(PRIMARY);
    doc.fontSize(22).fillColor("#ffffff").font("Helvetica-Bold")
      .text("Dra Branda Veterinaria", 50, 20, { width: pageWidth });
    doc.fontSize(10).fillColor("#d0f0e8").font("Helvetica")
      .text("Historial Clínico Veterinario", 50, 48, { width: pageWidth });
    doc.fontSize(8).fillColor("#d0f0e8")
      .text(`Generado: ${fmtDateTime(new Date())}`, 50, 62, { width: pageWidth, align: "right" });
    doc.restore();
    doc.y = 100;
  }

  function checkPageBreak(needed: number) {
    const bottom = doc.page.height - doc.page.margins.bottom;
    if (doc.y + needed > bottom) {
      doc.addPage();
      drawPageFooter();
    }
  }

  let pageNum = 0;
  function drawPageFooter() {
    pageNum++;
  }

  function sectionTitle(title: string) {
    checkPageBreak(40);
    doc.moveDown(0.8);
    doc.save();
    doc.rect(doc.page.margins.left, doc.y, pageWidth, 24).fill(LIGHT_BG);
    doc.fontSize(12).fillColor(PRIMARY).font("Helvetica-Bold")
      .text(title, doc.page.margins.left + 8, doc.y + 5, { width: pageWidth - 16 });
    doc.restore();
    doc.y += 30;
  }

  function infoLine(label: string, value: string | null | undefined, indent = 0) {
    if (!value || value === "—") return;
    checkPageBreak(16);
    const x = doc.page.margins.left + indent;
    doc.fontSize(9).fillColor(MUTED).font("Helvetica")
      .text(label + ": ", x, doc.y, { continued: true, width: pageWidth - indent });
    doc.fillColor(DARK).font("Helvetica-Bold").text(value);
  }

  function separator() {
    checkPageBreak(10);
    doc.moveDown(0.3);
    doc.save();
    doc.moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.restore();
    doc.moveDown(0.3);
  }

  // ── Page 1: Header + Patient Info ──
  drawHeader();

  // Patient name big
  doc.fontSize(18).fillColor(DARK).font("Helvetica-Bold")
    .text(pet.name, doc.page.margins.left, doc.y);
  doc.moveDown(0.2);

  // Basic info line
  const basicParts: string[] = [];
  if (pet.species) basicParts.push(pet.species);
  if (pet.breed) basicParts.push(pet.breed);
  if (pet.sex && pet.sex !== "desconocido") basicParts.push(pet.sex === "macho" ? "♂ Macho" : "♀ Hembra");
  if (pet.birthDate) basicParts.push(`Edad: ${calcAge(pet.birthDate)}`);
  if (basicParts.length > 0) {
    doc.fontSize(10).fillColor(MUTED).font("Helvetica").text(basicParts.join(" · "));
  }
  doc.moveDown(0.5);

  // Patient details
  sectionTitle("Datos del Paciente");
  infoLine("Especie", pet.species);
  infoLine("Raza", pet.breed);
  infoLine("Fecha de nacimiento", fmtDate(pet.birthDate));
  infoLine("Sexo", lbl(pet.sex));
  infoLine("Color", pet.color);
  infoLine("Peso", pet.weight ? `${pet.weight} kg` : null);
  infoLine("Microchip", pet.microchip);
  infoLine("Tipo de paciente", lbl(pet.patientType));
  infoLine("Castrado/a", lbl(pet.isNeutered));
  infoLine("Comportamiento", lbl(pet.behavior));

  // Environment
  if (pet.environment || pet.livesWithOtherAnimals || pet.otherAnimalsDetails) {
    separator();
    doc.fontSize(10).fillColor(PRIMARY).font("Helvetica-Bold").text("Ambiente y convivencia");
    doc.moveDown(0.2);
    infoLine("Ambiente", lbl(pet.environment), 4);
    infoLine("Convive con otros animales", pet.livesWithOtherAnimals ? "Sí" : pet.livesWithOtherAnimals === false ? "No" : null, 4);
    infoLine("Detalles", pet.otherAnimalsDetails, 4);
  }

  // Diet
  if (pet.dietType || pet.dietBrand || pet.dietNotes) {
    separator();
    doc.fontSize(10).fillColor(PRIMARY).font("Helvetica-Bold").text("Alimentación");
    doc.moveDown(0.2);
    infoLine("Tipo", lbl(pet.dietType), 4);
    infoLine("Marca", pet.dietBrand, 4);
    infoLine("Notas", pet.dietNotes, 4);
  }

  // Medical background
  if (pet.knownAllergies || pet.previousDiseases || pet.previousSurgeries || pet.currentMedication) {
    separator();
    doc.fontSize(10).fillColor(PRIMARY).font("Helvetica-Bold").text("Antecedentes Médicos");
    doc.moveDown(0.2);
    infoLine("Alergias conocidas", pet.knownAllergies, 4);
    infoLine("Enfermedades previas", pet.previousDiseases, 4);
    infoLine("Cirugías previas", pet.previousSurgeries, 4);
    infoLine("Medicación actual", pet.currentMedication, 4);
  }

  // Deworming
  if (pet.lastDewormingDate || pet.dewormingProduct) {
    separator();
    doc.fontSize(10).fillColor(PRIMARY).font("Helvetica-Bold").text("Desparasitación");
    doc.moveDown(0.2);
    infoLine("Última desparasitación", fmtDate(pet.lastDewormingDate), 4);
    infoLine("Producto", pet.dewormingProduct, 4);
  }

  // Notes
  if (pet.notes) {
    separator();
    doc.fontSize(10).fillColor(PRIMARY).font("Helvetica-Bold").text("Notas generales");
    doc.moveDown(0.2);
    doc.fontSize(9).fillColor(DARK).font("Helvetica").text(pet.notes, { width: pageWidth, indent: 4 });
  }

  // ── Owner / Familiar ──
  sectionTitle("Familiar Responsable");
  infoLine("Nombre", owner?.name);
  infoLine("Teléfono", owner?.phone);
  infoLine("Email", owner?.email);
  infoLine("Dirección", owner?.address);

  // ── Vaccinations ──
  sectionTitle(`Vacunas (${vaccinesList.length})`);
  if (vaccinesList.length === 0) {
    doc.fontSize(9).fillColor(MUTED).font("Helvetica-Oblique").text("No hay vacunas registradas.");
  } else {
    // Table header
    const colWidths = [130, 80, 80, 80, pageWidth - 370];
    const headers = ["Vacuna", "Fecha", "Próxima", "Dosis", "Lab / Notas"];
    let tableX = doc.page.margins.left;

    checkPageBreak(20);
    doc.save();
    doc.rect(tableX, doc.y, pageWidth, 16).fill(PRIMARY);
    headers.forEach((h, i) => {
      doc.fontSize(8).fillColor("#ffffff").font("Helvetica-Bold")
        .text(h, tableX + 4, doc.y + 3, { width: colWidths[i] - 8 });
      tableX += colWidths[i];
    });
    doc.restore();
    doc.y += 18;

    vaccinesList.forEach((v, idx) => {
      checkPageBreak(18);
      const rowY = doc.y;
      if (idx % 2 === 0) {
        doc.save();
        doc.rect(doc.page.margins.left, rowY, pageWidth, 16).fill("#f9f9f9");
        doc.restore();
      }

      const today = new Date();
      const nextDate = v.nextDoseDate ? new Date(String(v.nextDoseDate)) : null;
      const isOverdue = nextDate && nextDate < today && v.status === "aplicada";

      let x = doc.page.margins.left;
      const vals = [
        v.vaccineName,
        fmtDate(v.applicationDate),
        fmtDate(v.nextDoseDate) + (isOverdue ? " ⚠" : ""),
        v.doseNumber || "—",
        [v.laboratory, v.notes].filter(Boolean).join(" · ") || "—",
      ];
      vals.forEach((val, i) => {
        doc.fontSize(8).fillColor(i === 2 && isOverdue ? "#dc2626" : DARK).font("Helvetica")
          .text(val, x + 4, rowY + 3, { width: colWidths[i] - 8 });
        x += colWidths[i];
      });
      doc.y = rowY + 18;
    });
  }

  // ── Visits ──
  sectionTitle(`Historial de Visitas (${visitsList.length})`);
  if (visitsList.length === 0) {
    doc.fontSize(9).fillColor(MUTED).font("Helvetica-Oblique").text("No hay visitas registradas.");
  } else {
    visitsList.forEach((visit, idx) => {
      checkPageBreak(80);
      if (idx > 0) {
        separator();
      }

      // Visit header
      doc.fontSize(10).fillColor(PRIMARY).font("Helvetica-Bold")
        .text(`Visita ${idx + 1} — ${fmtDateTime(visit.visitDate)}`);
      doc.moveDown(0.2);

      infoLine("Motivo", visit.reason, 4);
      infoLine("Diagnóstico", visit.diagnosis, 4);
      infoLine("Tratamiento", visit.treatment, 4);
      infoLine("Medicación", visit.medications, 4);
      infoLine("Próximos pasos", visit.nextSteps, 4);

      // Physical exam
      const hasPhysical = visit.weight || visit.temperature || visit.heartRate || visit.respRate ||
        visit.bodyCondition || visit.mucosas || visit.hydration || visit.lymphNodes || visit.dentalStatus;
      if (hasPhysical) {
        checkPageBreak(20);
        doc.moveDown(0.2);
        doc.fontSize(9).fillColor(PRIMARY).font("Helvetica-Bold").text("Examen físico:", doc.page.margins.left + 4);
        doc.moveDown(0.1);
        infoLine("Peso", visit.weight ? `${visit.weight} kg` : null, 12);
        infoLine("Temperatura", visit.temperature ? `${visit.temperature}°C` : null, 12);
        infoLine("Frec. cardíaca", visit.heartRate, 12);
        infoLine("Frec. respiratoria", visit.respRate, 12);
        infoLine("Condición corporal", visit.bodyCondition, 12);
        infoLine("Mucosas", lbl(visit.mucosas), 12);
        infoLine("Hidratación", lbl(visit.hydration), 12);
        infoLine("Ganglios", lbl(visit.lymphNodes), 12);
        infoLine("Estado dental", lbl(visit.dentalStatus), 12);
      }

      // Notes
      if (visit.notes) {
        checkPageBreak(20);
        doc.moveDown(0.2);
        doc.fontSize(9).fillColor(PRIMARY).font("Helvetica-Bold").text("Notas clínicas:", doc.page.margins.left + 4);
        doc.fontSize(9).fillColor(DARK).font("Helvetica").text(visit.notes, { width: pageWidth - 8, indent: 12 });
      }

      // Audio transcription
      if (visit.audioTranscription) {
        checkPageBreak(20);
        doc.moveDown(0.2);
        doc.fontSize(9).fillColor(PRIMARY).font("Helvetica-Bold").text("Transcripción de audio:", doc.page.margins.left + 4);
        doc.fontSize(8).fillColor(MUTED).font("Helvetica-Oblique").text(visit.audioTranscription, { width: pageWidth - 8, indent: 12 });
      }

      // Attachments list
      const atts = allAttachments[visit.id];
      if (atts && atts.length > 0) {
        checkPageBreak(16);
        doc.moveDown(0.2);
        doc.fontSize(9).fillColor(PRIMARY).font("Helvetica-Bold").text("Archivos adjuntos:", doc.page.margins.left + 4);
        atts.forEach((att) => {
          checkPageBreak(12);
          const icon = att.mimeType?.startsWith("image/") ? "📷" : "📎";
          doc.fontSize(8).fillColor(MUTED).font("Helvetica").text(`  ${icon} ${att.fileName}`, { indent: 12 });
        });
      }
    });
  }

  // ── Footer on each page ──
  const totalPages = doc.bufferedPageRange();
  // We'll add page numbers after finishing content

  doc.end();

  // Wait for PDF to finish
  const pdfBuffer = await new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // 3. Upload to S3
  const key = `exports/historial-${pet.name.replace(/\s+/g, "-").toLowerCase()}-${nanoid(8)}.pdf`;
  const { url } = await storagePut(key, pdfBuffer, "application/pdf");

  return { url, key };
}
