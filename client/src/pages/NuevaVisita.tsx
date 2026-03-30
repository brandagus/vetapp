import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, X, Calendar, Stethoscope, Weight, Thermometer,
  Heart, Activity, FileText, Save, Loader2, Eye, Droplets, CircleDot, Smile,
} from "lucide-react";
import { useState, useMemo } from "react";

// ── All optional fields with types ──
type FieldDef = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
  type: "text" | "textarea" | "select";
  options?: { value: string; label: string }[];
};

const OPTIONAL_FIELDS: FieldDef[] = [
  // Signos vitales
  { key: "weight", label: "Peso (kg)", icon: Weight, placeholder: "ej: 12.5", type: "text" },
  { key: "temperature", label: "Temperatura (°C)", icon: Thermometer, placeholder: "ej: 38.5", type: "text" },
  { key: "heartRate", label: "Frec. cardíaca (lpm)", icon: Heart, placeholder: "ej: 120", type: "text" },
  { key: "respRate", label: "Frec. respiratoria (rpm)", icon: Activity, placeholder: "ej: 24", type: "text" },
  { key: "bodyCondition", label: "Condición corporal (1-9)", icon: FileText, placeholder: "ej: 5", type: "text" },
  // Examen físico
  { key: "mucosas", label: "Mucosas", icon: Eye, placeholder: "", type: "select", options: [
    { value: "rosadas", label: "Rosadas (normal)" }, { value: "palidas", label: "Pálidas" },
    { value: "ictericas", label: "Ictéricas" }, { value: "cianoticas", label: "Cianóticas" },
  ]},
  { key: "hydration", label: "Hidratación", icon: Droplets, placeholder: "", type: "select", options: [
    { value: "normal", label: "Normal" }, { value: "leve", label: "Deshidratación leve" },
    { value: "moderada", label: "Deshidratación moderada" }, { value: "severa", label: "Deshidratación severa" },
  ]},
  { key: "lymphNodes", label: "Ganglios linfáticos", icon: CircleDot, placeholder: "", type: "select", options: [
    { value: "normal", label: "Normal" }, { value: "aumentados", label: "Aumentados" },
  ]},
  { key: "dentalStatus", label: "Estado dental", icon: Smile, placeholder: "", type: "select", options: [
    { value: "bueno", label: "Bueno" }, { value: "regular", label: "Regular" }, { value: "malo", label: "Malo" },
  ]},
  // Clínico
  { key: "diagnosis", label: "Diagnóstico", icon: Stethoscope, placeholder: "Diagnóstico...", type: "textarea" },
  { key: "treatment", label: "Tratamiento", icon: FileText, placeholder: "Tratamiento aplicado...", type: "textarea" },
  { key: "medications", label: "Medicación", icon: FileText, placeholder: "Medicamentos recetados...", type: "textarea" },
  { key: "nextSteps", label: "Próximos pasos", icon: Calendar, placeholder: "Seguimiento, controles...", type: "textarea" },
];

// Group fields for the popover
const FIELD_GROUPS = [
  { title: "Signos vitales", keys: ["weight", "temperature", "heartRate", "respRate", "bodyCondition"] },
  { title: "Examen físico", keys: ["mucosas", "hydration", "lymphNodes", "dentalStatus"] },
  { title: "Clínico", keys: ["diagnosis", "treatment", "medications", "nextSteps"] },
];

function speciesEmoji(species: string): string {
  const s = species.toLowerCase();
  if (s.includes("perro") || s.includes("can")) return "🐕";
  if (s.includes("gato") || s.includes("felin")) return "🐈";
  if (s.includes("ave") || s.includes("pájaro") || s.includes("pajaro")) return "🐦";
  if (s.includes("conejo")) return "🐇";
  return "🐾";
}

function nowLocalISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export default function NuevaVisita() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const petId = Number(params.id);

  const { data: pet, isLoading: petLoading } = trpc.pets.getProfile.useQuery({ id: petId });
  const createVisitMut = trpc.visits.create.useMutation();
  const utils = trpc.useUtils();

  // Form state
  const [visitDate, setVisitDate] = useState(nowLocalISO());
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [activeFields, setActiveFields] = useState<Set<string>>(new Set());
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [addFieldOpen, setAddFieldOpen] = useState(false);

  const availableFields = useMemo(
    () => OPTIONAL_FIELDS.filter((f) => !activeFields.has(f.key)),
    [activeFields]
  );

  const addField = (key: string) => {
    setActiveFields((prev) => new Set(prev).add(key));
    setAddFieldOpen(false);
  };

  const addAllInGroup = (keys: string[]) => {
    setActiveFields((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => next.add(k));
      return next;
    });
    setAddFieldOpen(false);
  };

  const removeField = (key: string) => {
    setActiveFields((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setFieldValues((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const setFieldValue = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("El motivo de consulta es obligatorio");
      return;
    }
    if (!pet) return;

    try {
      const result = await createVisitMut.mutateAsync({
        petId,
        ownerId: pet.ownerId,
        visitDate: new Date(visitDate).toISOString(),
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        diagnosis: fieldValues.diagnosis || undefined,
        treatment: fieldValues.treatment || undefined,
        medications: fieldValues.medications || undefined,
        nextSteps: fieldValues.nextSteps || undefined,
        weight: fieldValues.weight || undefined,
        temperature: fieldValues.temperature || undefined,
        heartRate: fieldValues.heartRate || undefined,
        respRate: fieldValues.respRate || undefined,
        bodyCondition: fieldValues.bodyCondition || undefined,
        mucosas: (fieldValues.mucosas as "rosadas" | "palidas" | "ictericas" | "cianoticas") || undefined,
        hydration: (fieldValues.hydration as "normal" | "leve" | "moderada" | "severa") || undefined,
        lymphNodes: (fieldValues.lymphNodes as "normal" | "aumentados") || undefined,
        dentalStatus: (fieldValues.dentalStatus as "bueno" | "regular" | "malo") || undefined,
      });
      toast.success("Visita registrada");
      utils.visits.listByPet.invalidate({ petId });
      utils.pets.getProfile.invalidate({ id: petId });
      setLocation(`/visita/${result.id}`);
    } catch {
      toast.error("Error al guardar la visita");
    }
  };

  if (petLoading) {
    return (
      <div className="max-w-3xl space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-24 bg-muted rounded-xl" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="max-w-3xl">
        <Button variant="ghost" onClick={() => setLocation("/pacientes")}><ArrowLeft className="h-4 w-4 mr-2" /> Volver</Button>
        <p className="text-muted-foreground mt-8 text-center">Paciente no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6 pb-8">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => setLocation(`/pacientes/${petId}`)} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Volver al perfil
      </Button>

      {/* ── PATIENT HEADER (auto-filled) ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary/20">
              <AvatarImage src={pet.photoUrl ?? undefined} alt={pet.name} className="object-cover" />
              <AvatarFallback className="text-xl bg-primary/10">{speciesEmoji(pet.species)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold font-display">{pet.name}</h2>
                <Badge variant="secondary" className="capitalize text-xs">{pet.species}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {pet.breed && `${pet.breed} · `}
                Familiar: {pet.ownerName}
                {pet.ownerPhone && ` · ${pet.ownerPhone}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── VISIT FORM ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Nueva visita clínica
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Date & Time (auto-filled) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-1.5 mb-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Fecha y hora *
              </Label>
              <Input type="datetime-local" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="h-11" />
            </div>
          </div>

          <Separator />

          {/* Reason (always visible, required) */}
          <div>
            <Label className="flex items-center gap-1.5 mb-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Motivo de consulta *
            </Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="¿Por qué vino el paciente?" rows={2} className="resize-none" />
          </div>

          {/* Free-text clinical notes (always visible) */}
          <div>
            <Label className="flex items-center gap-1.5 mb-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Notas clínicas
            </Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas libres: observaciones, examen físico, comentarios..." rows={4} className="resize-y" />
          </div>

          {/* ── DYNAMIC OPTIONAL FIELDS ── */}
          {activeFields.size > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                {OPTIONAL_FIELDS.filter((f) => activeFields.has(f.key)).map((field) => (
                  <div key={field.key} className="group relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="flex items-center gap-1.5">
                        <field.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        {field.label}
                      </Label>
                      <button onClick={() => removeField(field.key)} className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Quitar campo">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {field.type === "textarea" ? (
                      <Textarea value={fieldValues[field.key] ?? ""} onChange={(e) => setFieldValue(field.key, e.target.value)} placeholder={field.placeholder} rows={3} className="resize-y" />
                    ) : field.type === "select" && field.options ? (
                      <Select value={fieldValues[field.key] ?? ""} onValueChange={(v) => setFieldValue(field.key, v)}>
                        <SelectTrigger className="h-11"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {field.options.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={fieldValues[field.key] ?? ""} onChange={(e) => setFieldValue(field.key, e.target.value)} placeholder={field.placeholder} className="h-11" />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── ADD FIELD BUTTON (+) ── */}
          {availableFields.length > 0 && (
            <Popover open={addFieldOpen} onOpenChange={setAddFieldOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full border-dashed gap-2 text-muted-foreground hover:text-foreground">
                  <Plus className="h-4 w-4" /> Agregar campo
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="center">
                <div className="space-y-3">
                  {FIELD_GROUPS.map((group) => {
                    const groupAvailable = group.keys.filter((k) => !activeFields.has(k));
                    if (groupAvailable.length === 0) return null;
                    return (
                      <div key={group.title}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.title}</p>
                          {groupAvailable.length > 1 && (
                            <button onClick={() => addAllInGroup(groupAvailable)} className="text-xs text-primary hover:underline">
                              Agregar todos
                            </button>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          {groupAvailable.map((key) => {
                            const field = OPTIONAL_FIELDS.find((f) => f.key === key)!;
                            return (
                              <button key={key} onClick={() => addField(key)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors text-left">
                                <field.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span>{field.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          )}

          <Separator />

          {/* Submit */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setLocation(`/pacientes/${petId}`)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createVisitMut.isPending || !reason.trim()} className="gap-2">
              {createVisitMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar visita
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
