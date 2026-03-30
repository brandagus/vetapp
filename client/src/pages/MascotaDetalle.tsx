import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar, Stethoscope, DollarSign,
  Camera, Edit, Plus, FileText, ChevronRight, ChevronDown, Weight, Thermometer,
  Trash2, Syringe, Home, UtensilsCrossed, HeartPulse, Bug, AlertTriangle,
  Loader2, Clock, Pill, Scissors,
} from "lucide-react";
import { useState, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ── Helpers ──
function toDate(d: unknown): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  if (typeof d === "string" || typeof d === "number") return new Date(d);
  return null;
}
function formatDate(d: unknown) {
  const date = toDate(d);
  if (!date) return "—";
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}
function formatDateTime(d: unknown) {
  const date = toDate(d);
  if (!date) return "—";
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function calcAge(birthDate: unknown): string {
  if (!birthDate) return "Edad desconocida";
  const birth = birthDate instanceof Date ? birthDate : new Date(String(birthDate));
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  if (years > 0) return `${years} año${years > 1 ? "s" : ""}`;
  if (months > 0) return `${months} mes${months > 1 ? "es" : ""}`;
  return "< 1 mes";
}
function speciesEmoji(species: string): string {
  const s = species.toLowerCase();
  if (s.includes("perro") || s.includes("can")) return "🐕";
  if (s.includes("gato") || s.includes("felin")) return "🐈";
  if (s.includes("ave") || s.includes("pájaro") || s.includes("pajaro")) return "🐦";
  if (s.includes("conejo")) return "🐇";
  if (s.includes("reptil")) return "🦎";
  return "🐾";
}

// ── Collapsible section ──
function ProfileSection({
  title, icon: Icon, children, defaultOpen = false, badge,
}: {
  title: string; icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode; defaultOpen?: boolean; badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 md:px-6 py-3.5 hover:bg-accent/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2 font-semibold text-sm md:text-base">
          <Icon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          {title}
          {badge}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <CardContent className="pt-0 pb-4">{children}</CardContent>}
    </Card>
  );
}

// ── Label-value pair ──
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value || value === "—") return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

const labelMap: Record<string, string> = {
  interior: "Interior", exterior: "Exterior", mixto: "Mixto",
  balanceado: "Balanceado", casera: "Casera", mixta: "Mixta", barf: "BARF", otra: "Otra",
  si: "Sí", no: "No", no_se: "No sé",
  tranquilo: "Tranquilo", nervioso: "Nervioso", agresivo: "Agresivo", miedoso: "Miedoso", otro: "Otro",
  seguimiento: "Seguimiento", visita_unica: "Visita única",
};
function label(v: string | null | undefined) { return v ? (labelMap[v] || v) : null; }

export default function MascotaDetalle() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const petId = Number(params.id);
  const utils = trpc.useUtils();

  const { data: pet, isLoading } = trpc.pets.getProfile.useQuery({ id: petId });
  const { data: visitsList } = trpc.visits.listByPet.useQuery({ petId });
  const { data: vaccinesList } = trpc.vaccinations.listByPet.useQuery({ petId });

  const uploadPhotoMut = trpc.pets.uploadPhoto.useMutation({
    onSuccess: () => { utils.pets.getProfile.invalidate({ id: petId }); toast.success("Foto actualizada"); },
    onError: () => toast.error("Error al subir la foto"),
  });
  const updatePetMut = trpc.pets.update.useMutation({
    onSuccess: () => { utils.pets.getProfile.invalidate({ id: petId }); setShowEditDialog(false); toast.success("Datos actualizados"); },
    onError: () => toast.error("Error al guardar"),
  });
  const deleteMut = trpc.pets.delete.useMutation({
    onSuccess: () => { utils.pets.list.invalidate(); setLocation("/pacientes"); toast.success("Paciente eliminado"); },
  });

  // Vaccination mutations
  const createVaccineMut = trpc.vaccinations.create.useMutation({
    onSuccess: () => { utils.vaccinations.listByPet.invalidate({ petId }); setShowVaccineDialog(false); toast.success("Vacuna registrada"); },
    onError: () => toast.error("Error al registrar vacuna"),
  });
  const deleteVaccineMut = trpc.vaccinations.delete.useMutation({
    onSuccess: () => { utils.vaccinations.listByPet.invalidate({ petId }); toast.success("Vacuna eliminada"); },
  });

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [showVaccineDialog, setShowVaccineDialog] = useState(false);
  const [vaccineForm, setVaccineForm] = useState({
    vaccineName: "", laboratory: "", lotNumber: "", doseNumber: "",
    applicationDate: new Date().toISOString().split("T")[0], nextDoseDate: "", notes: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-48 bg-muted rounded-xl" />
        <div className="h-32 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="max-w-4xl">
        <Button variant="ghost" onClick={() => setLocation("/pacientes")}><ArrowLeft className="h-4 w-4 mr-2" /> Volver</Button>
        <p className="text-muted-foreground mt-8 text-center">Paciente no encontrado.</p>
      </div>
    );
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("La imagen no puede superar 5MB"); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      try { await uploadPhotoMut.mutateAsync({ petId, fileName: file.name, mimeType: file.type, fileBase64: base64 }); } catch {}
    };
    reader.readAsDataURL(file);
  };

  const openEdit = () => {
    setEditForm({
      name: pet.name, species: pet.species, breed: pet.breed ?? "", birthDate: pet.birthDate ? String(pet.birthDate) : "",
      sex: pet.sex ?? "desconocido", color: pet.color ?? "", weight: pet.weight ?? "", microchip: pet.microchip ?? "",
      notes: pet.notes ?? "", patientType: pet.patientType ?? "", environment: pet.environment ?? "",
      dietType: pet.dietType ?? "", dietBrand: pet.dietBrand ?? "", dietNotes: pet.dietNotes ?? "",
      knownAllergies: pet.knownAllergies ?? "", previousDiseases: pet.previousDiseases ?? "",
      previousSurgeries: pet.previousSurgeries ?? "", currentMedication: pet.currentMedication ?? "",
      isNeutered: pet.isNeutered ?? "", behavior: pet.behavior ?? "",
      lastDewormingDate: pet.lastDewormingDate ? String(pet.lastDewormingDate) : "", dewormingProduct: pet.dewormingProduct ?? "",
      otherAnimalsDetails: pet.otherAnimalsDetails ?? "",
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    await updatePetMut.mutateAsync({
      id: petId, name: editForm.name, species: editForm.species,
      breed: editForm.breed || undefined, birthDate: editForm.birthDate || undefined,
      sex: (editForm.sex as "macho" | "hembra" | "desconocido") || undefined,
      color: editForm.color || undefined, weight: editForm.weight || undefined,
      microchip: editForm.microchip || undefined, notes: editForm.notes || undefined,
      patientType: (editForm.patientType as "seguimiento" | "visita_unica") || undefined,
      environment: (editForm.environment as "interior" | "exterior" | "mixto") || undefined,
      dietType: (editForm.dietType as "balanceado" | "casera" | "mixta" | "barf" | "otra") || undefined,
      dietBrand: editForm.dietBrand || undefined, dietNotes: editForm.dietNotes || undefined,
      knownAllergies: editForm.knownAllergies || undefined, previousDiseases: editForm.previousDiseases || undefined,
      previousSurgeries: editForm.previousSurgeries || undefined, currentMedication: editForm.currentMedication || undefined,
      isNeutered: (editForm.isNeutered as "si" | "no" | "no_se") || undefined,
      behavior: (editForm.behavior as "tranquilo" | "nervioso" | "agresivo" | "miedoso" | "otro") || undefined,
      lastDewormingDate: editForm.lastDewormingDate || undefined, dewormingProduct: editForm.dewormingProduct || undefined,
      otherAnimalsDetails: editForm.otherAnimalsDetails || undefined,
      livesWithOtherAnimals: editForm.otherAnimalsDetails ? true : undefined,
    });
  };

  const handleSaveVaccine = () => {
    if (!vaccineForm.vaccineName || !vaccineForm.applicationDate) {
      toast.error("Nombre de vacuna y fecha son requeridos");
      return;
    }
    createVaccineMut.mutate({
      petId, vaccineName: vaccineForm.vaccineName,
      laboratory: vaccineForm.laboratory || undefined, lotNumber: vaccineForm.lotNumber || undefined,
      doseNumber: vaccineForm.doseNumber || undefined, applicationDate: vaccineForm.applicationDate,
      nextDoseDate: vaccineForm.nextDoseDate || undefined, notes: vaccineForm.notes || undefined,
    });
  };

  // Check for overdue vaccines
  const today = new Date();
  const overdueVaccines = (vaccinesList ?? []).filter((v) => {
    if (!v.nextDoseDate || v.status !== "aplicada") return false;
    return toDate(v.nextDoseDate)! < today;
  });

  // Check if profile has any extended info
  const hasEnvironment = pet.environment || pet.livesWithOtherAnimals || pet.otherAnimalsDetails;
  const hasDiet = pet.dietType || pet.dietBrand || pet.dietNotes;
  const hasMedical = pet.knownAllergies || pet.previousDiseases || pet.previousSurgeries || pet.currentMedication;
  const hasDeworming = pet.lastDewormingDate || pet.dewormingProduct;

  return (
    <div className="max-w-4xl space-y-4 pb-8">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => setLocation("/pacientes")} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Pacientes
      </Button>

      {/* ═══════════════════════════════════════════════════════
          PATIENT HEADER CARD
         ═══════════════════════════════════════════════════════ */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 md:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            {/* Photo */}
            <div className="relative shrink-0 self-center sm:self-start">
              <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-background shadow-lg">
                <AvatarImage src={pet.photoUrl ?? undefined} alt={pet.name} className="object-cover" />
                <AvatarFallback className="text-3xl bg-primary/10">{speciesEmoji(pet.species)}</AvatarFallback>
              </Avatar>
              <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors">
                <Camera className="h-4 w-4" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h1 className="text-2xl md:text-3xl font-bold font-display truncate">{pet.name}</h1>
                <div className="flex gap-2 justify-center sm:justify-start flex-wrap">
                  <Badge variant="secondary" className="capitalize">{speciesEmoji(pet.species)} {pet.species}</Badge>
                  {pet.sex && pet.sex !== "desconocido" && (
                    <Badge variant="outline" className="capitalize">{pet.sex === "macho" ? "♂ Macho" : "♀ Hembra"}</Badge>
                  )}
                  {pet.patientType && (
                    <Badge variant={pet.patientType === "seguimiento" ? "default" : "outline"} className="capitalize">
                      {pet.patientType === "seguimiento" ? "📋 Seguimiento" : "🔹 Visita única"}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground justify-center sm:justify-start">
                {pet.breed && <span>{pet.breed}</span>}
                {pet.birthDate && <span>{calcAge(pet.birthDate)}</span>}
                {pet.color && <span>{pet.color}</span>}
                {pet.weight && <span>{pet.weight} kg</span>}
                {pet.microchip && <span>Chip: {pet.microchip}</span>}
                {pet.isNeutered && <span>{pet.isNeutered === "si" ? "✂️ Castrado" : pet.isNeutered === "no" ? "No castrado" : ""}</span>}
                {pet.behavior && <span>{label(pet.behavior)}</span>}
              </div>

              {/* Quick stats */}
              <div className="flex flex-wrap gap-3 mt-3 justify-center sm:justify-start">
                <div className="flex items-center gap-1.5 text-xs bg-background/80 rounded-full px-3 py-1.5 shadow-sm">
                  <Stethoscope className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium">{pet.visitCount ?? 0} visitas</span>
                </div>
                {pet.lastVisit && (
                  <div className="flex items-center gap-1.5 text-xs bg-background/80 rounded-full px-3 py-1.5 shadow-sm">
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                    <span>Última: {formatDate(pet.lastVisit.visitDate)}</span>
                  </div>
                )}
                {pet.lastPayment && (
                  <div className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 shadow-sm ${pet.lastPayment.status === "pagado" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>${pet.lastPayment.amount} · {pet.lastPayment.status === "pagado" ? "Pagado" : "Pendiente"}</span>
                  </div>
                )}
                {overdueVaccines.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 shadow-sm bg-red-50 text-red-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>{overdueVaccines.length} vacuna{overdueVaccines.length > 1 ? "s" : ""} vencida{overdueVaccines.length > 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2 justify-center sm:justify-start flex-wrap">
                <Button size="sm" variant="outline" onClick={openEdit} className="gap-1.5"><Edit className="h-3.5 w-3.5" /> Editar</Button>
                <Button size="sm" onClick={() => setLocation(`/pacientes/${petId}/nueva-visita`)} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Nueva visita</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/30 gap-1.5"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar paciente?</AlertDialogTitle>
                      <AlertDialogDescription>Se eliminará {pet.name} y todos sus datos. Esta acción no se puede deshacer.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteMut.mutate({ id: petId })}>Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════════════
          FAMILIAR INFO
         ═══════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Familiar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><User className="h-4 w-4 text-primary" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground">Nombre</p><p className="font-medium text-sm">{pet.ownerName ?? "—"}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0"><Phone className="h-4 w-4 text-blue-600" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground">Teléfono</p><p className="font-medium text-sm">{pet.ownerPhone ? <a href={`tel:${pet.ownerPhone}`} className="text-blue-600 hover:underline">{pet.ownerPhone}</a> : "—"}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0"><Mail className="h-4 w-4 text-purple-600" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground">Email</p><p className="font-medium text-sm">{pet.ownerEmail ? <a href={`mailto:${pet.ownerEmail}`} className="text-purple-600 hover:underline">{pet.ownerEmail}</a> : "—"}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center shrink-0"><MapPin className="h-4 w-4 text-green-600" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground">Dirección</p><p className="font-medium text-sm">{pet.ownerAddress ?? "—"}</p></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════
          EXTENDED PROFILE SECTIONS (collapsible, only show if data)
         ═══════════════════════════════════════════════════════ */}
      {hasEnvironment && (
        <ProfileSection title="Ambiente y convivencia" icon={Home}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
            <InfoRow label="Ambiente" value={label(pet.environment)} />
            <InfoRow label="Convive con otros animales" value={pet.livesWithOtherAnimals ? "Sí" : pet.livesWithOtherAnimals === false ? "No" : null} />
            <InfoRow label="Detalles" value={pet.otherAnimalsDetails} />
          </div>
        </ProfileSection>
      )}

      {hasDiet && (
        <ProfileSection title="Alimentación" icon={UtensilsCrossed}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
            <InfoRow label="Tipo" value={label(pet.dietType)} />
            <InfoRow label="Marca" value={pet.dietBrand} />
            <InfoRow label="Notas" value={pet.dietNotes} />
          </div>
        </ProfileSection>
      )}

      {hasMedical && (
        <ProfileSection title="Antecedentes médicos" icon={HeartPulse} defaultOpen>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <InfoRow label="Alergias conocidas" value={pet.knownAllergies} />
            <InfoRow label="Enfermedades previas" value={pet.previousDiseases} />
            <InfoRow label="Cirugías previas" value={pet.previousSurgeries} />
            <InfoRow label="Medicación actual" value={pet.currentMedication} />
          </div>
        </ProfileSection>
      )}

      {hasDeworming && (
        <ProfileSection title="Desparasitación" icon={Bug}>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <InfoRow label="Última desparasitación" value={formatDate(pet.lastDewormingDate)} />
            <InfoRow label="Producto" value={pet.dewormingProduct} />
          </div>
        </ProfileSection>
      )}

      {pet.notes && (
        <ProfileSection title="Notas generales" icon={FileText}>
          <p className="text-sm whitespace-pre-wrap pt-2">{pet.notes}</p>
        </ProfileSection>
      )}

      {/* ═══════════════════════════════════════════════════════
          VACCINATIONS
         ═══════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold font-display flex items-center gap-2">
            <Syringe className="h-5 w-5 text-primary" /> Vacunas
          </h2>
          <Button size="sm" onClick={() => { setVaccineForm({ vaccineName: "", laboratory: "", lotNumber: "", doseNumber: "", applicationDate: new Date().toISOString().split("T")[0], nextDoseDate: "", notes: "" }); setShowVaccineDialog(true); }} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Agregar vacuna
          </Button>
        </div>

        {!vaccinesList || vaccinesList.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Syringe className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No hay vacunas registradas.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowVaccineDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Registrar primera vacuna
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {vaccinesList.map((v) => {
              const nextDate = toDate(v.nextDoseDate);
              const isOverdue = nextDate && nextDate < today && v.status === "aplicada";
              return (
                <Card key={v.id} className={isOverdue ? "border-red-300 bg-red-50/50" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{v.vaccineName}</span>
                          {v.doseNumber && <Badge variant="outline" className="text-xs">Dosis {v.doseNumber}</Badge>}
                          {isOverdue && <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" /> Vencida</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Aplicada: {formatDate(v.applicationDate)}</span>
                          {v.nextDoseDate && <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : ""}`}><Clock className="h-3 w-3" /> Próxima: {formatDate(v.nextDoseDate)}</span>}
                          {v.laboratory && <span>Lab: {v.laboratory}</span>}
                          {v.lotNumber && <span>Lote: {v.lotNumber}</span>}
                        </div>
                        {v.notes && <p className="text-xs text-muted-foreground mt-1 italic">{v.notes}</p>}
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive h-8 w-8 p-0" onClick={() => deleteVaccineMut.mutate({ id: v.id })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          VISIT HISTORY
         ═══════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold font-display flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" /> Historial de visitas
          </h2>
          <Button size="sm" onClick={() => setLocation(`/pacientes/${petId}/nueva-visita`)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Nueva visita
          </Button>
        </div>

        {!visitsList || visitsList.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Stethoscope className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No hay visitas registradas aún.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setLocation(`/pacientes/${petId}/nueva-visita`)}>
                <Plus className="h-4 w-4 mr-1" /> Registrar primera visita
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {visitsList.map((visit) => (
              <Card key={visit.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setLocation(`/visita/${visit.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{formatDateTime(visit.visitDate)}</span>
                        {visit.diagnosis && <Badge variant="secondary" className="text-xs">{visit.diagnosis.length > 30 ? visit.diagnosis.slice(0, 30) + "…" : visit.diagnosis}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{visit.reason}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        {visit.weight && <span className="flex items-center gap-1"><Weight className="h-3 w-3" /> {visit.weight} kg</span>}
                        {visit.temperature && <span className="flex items-center gap-1"><Thermometer className="h-3 w-3" /> {visit.temperature}°C</span>}
                        {visit.medications && <span className="flex items-center gap-1"><Pill className="h-3 w-3" /> Medicación</span>}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          EDIT DIALOG
         ═══════════════════════════════════════════════════════ */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar paciente</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nombre *</Label><Input value={editForm.name ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Especie *</Label><Input value={editForm.species ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, species: e.target.value }))} /></div>
              <div><Label>Raza</Label><Input value={editForm.breed ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, breed: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Fecha de nacimiento</Label><Input type="date" value={editForm.birthDate ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, birthDate: e.target.value }))} /></div>
              <div><Label>Sexo</Label>
                <Select value={editForm.sex ?? "desconocido"} onValueChange={(v) => setEditForm((f) => ({ ...f, sex: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="macho">Macho</SelectItem><SelectItem value="hembra">Hembra</SelectItem><SelectItem value="desconocido">Desconocido</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Color</Label><Input value={editForm.color ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))} /></div>
              <div><Label>Peso (kg)</Label><Input value={editForm.weight ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, weight: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Microchip</Label><Input value={editForm.microchip ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, microchip: e.target.value }))} /></div>
              <div><Label>Tipo de paciente</Label>
                <Select value={editForm.patientType || "none"} onValueChange={(v) => setEditForm((f) => ({ ...f, patientType: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Sin definir</SelectItem><SelectItem value="visita_unica">Visita única</SelectItem><SelectItem value="seguimiento">Seguimiento</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Castrado</Label>
                <Select value={editForm.isNeutered || "none"} onValueChange={(v) => setEditForm((f) => ({ ...f, isNeutered: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Sin definir</SelectItem><SelectItem value="si">Sí</SelectItem><SelectItem value="no">No</SelectItem><SelectItem value="no_se">No sé</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Comportamiento</Label>
                <Select value={editForm.behavior || "none"} onValueChange={(v) => setEditForm((f) => ({ ...f, behavior: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Sin definir</SelectItem><SelectItem value="tranquilo">Tranquilo</SelectItem><SelectItem value="nervioso">Nervioso</SelectItem><SelectItem value="agresivo">Agresivo</SelectItem><SelectItem value="miedoso">Miedoso</SelectItem><SelectItem value="otro">Otro</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ambiente y alimentación</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ambiente</Label>
                <Select value={editForm.environment || "none"} onValueChange={(v) => setEditForm((f) => ({ ...f, environment: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Sin definir</SelectItem><SelectItem value="interior">Interior</SelectItem><SelectItem value="exterior">Exterior</SelectItem><SelectItem value="mixto">Mixto</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Tipo alimentación</Label>
                <Select value={editForm.dietType || "none"} onValueChange={(v) => setEditForm((f) => ({ ...f, dietType: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Sin definir</SelectItem><SelectItem value="balanceado">Balanceado</SelectItem><SelectItem value="casera">Casera</SelectItem><SelectItem value="mixta">Mixta</SelectItem><SelectItem value="barf">BARF</SelectItem><SelectItem value="otra">Otra</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Marca alimento</Label><Input value={editForm.dietBrand ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, dietBrand: e.target.value }))} /></div>
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Antecedentes médicos</p>
            <div><Label>Alergias</Label><Textarea value={editForm.knownAllergies ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, knownAllergies: e.target.value }))} rows={2} /></div>
            <div><Label>Enfermedades previas</Label><Textarea value={editForm.previousDiseases ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, previousDiseases: e.target.value }))} rows={2} /></div>
            <div><Label>Cirugías previas</Label><Textarea value={editForm.previousSurgeries ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, previousSurgeries: e.target.value }))} rows={2} /></div>
            <div><Label>Medicación actual</Label><Textarea value={editForm.currentMedication ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, currentMedication: e.target.value }))} rows={2} /></div>
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Desparasitación</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Última desparasitación</Label><Input type="date" value={editForm.lastDewormingDate ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, lastDewormingDate: e.target.value }))} /></div>
              <div><Label>Producto</Label><Input value={editForm.dewormingProduct ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, dewormingProduct: e.target.value }))} /></div>
            </div>
            <div><Label>Notas generales</Label><Textarea value={editForm.notes ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={updatePetMut.isPending}>{updatePetMut.isPending ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════
          VACCINE DIALOG
         ═══════════════════════════════════════════════════════ */}
      <Dialog open={showVaccineDialog} onOpenChange={setShowVaccineDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Syringe className="h-5 w-5 text-primary" /> Registrar vacuna</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nombre de la vacuna *</Label><Input value={vaccineForm.vaccineName} onChange={(e) => setVaccineForm((f) => ({ ...f, vaccineName: e.target.value }))} placeholder="Ej: Antirrábica, Triple felina..." className="h-11" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Fecha de aplicación *</Label><Input type="date" value={vaccineForm.applicationDate} onChange={(e) => setVaccineForm((f) => ({ ...f, applicationDate: e.target.value }))} className="h-11" /></div>
              <div><Label>Próxima dosis</Label><Input type="date" value={vaccineForm.nextDoseDate} onChange={(e) => setVaccineForm((f) => ({ ...f, nextDoseDate: e.target.value }))} className="h-11" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Laboratorio</Label><Input value={vaccineForm.laboratory} onChange={(e) => setVaccineForm((f) => ({ ...f, laboratory: e.target.value }))} placeholder="Ej: Merial, Zoetis..." className="h-11" /></div>
              <div><Label>Número de dosis</Label><Input value={vaccineForm.doseNumber} onChange={(e) => setVaccineForm((f) => ({ ...f, doseNumber: e.target.value }))} placeholder="Ej: 1ra, 2da, refuerzo" className="h-11" /></div>
            </div>
            <div><Label>Lote</Label><Input value={vaccineForm.lotNumber} onChange={(e) => setVaccineForm((f) => ({ ...f, lotNumber: e.target.value }))} placeholder="Número de lote" className="h-11" /></div>
            <div><Label>Notas</Label><Textarea value={vaccineForm.notes} onChange={(e) => setVaccineForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Observaciones..." rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVaccineDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveVaccine} disabled={createVaccineMut.isPending} className="gap-1.5">
              {createVaccineMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Syringe className="h-4 w-4" />}
              Guardar vacuna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
