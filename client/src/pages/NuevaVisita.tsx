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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  X,
  Calendar,
  Clock,
  Stethoscope,
  Weight,
  Thermometer,
  Heart,
  Activity,
  FileText,
  Save,
  Loader2,
} from "lucide-react";
import { useState, useMemo } from "react";

// All possible optional fields
const OPTIONAL_FIELDS = [
  { key: "weight", label: "Peso (kg)", icon: Weight, placeholder: "ej: 12.5" },
  { key: "temperature", label: "Temperatura (°C)", icon: Thermometer, placeholder: "ej: 38.5" },
  { key: "heartRate", label: "Frec. cardíaca (lpm)", icon: Heart, placeholder: "ej: 120" },
  { key: "respRate", label: "Frec. respiratoria (rpm)", icon: Activity, placeholder: "ej: 24" },
  { key: "bodyCondition", label: "Condición corporal (1-9)", icon: FileText, placeholder: "ej: 5" },
  { key: "diagnosis", label: "Diagnóstico", icon: Stethoscope, placeholder: "Diagnóstico...", multiline: true },
  { key: "treatment", label: "Tratamiento", icon: FileText, placeholder: "Tratamiento aplicado...", multiline: true },
  { key: "medications", label: "Medicación", icon: FileText, placeholder: "Medicamentos recetados...", multiline: true },
  { key: "nextSteps", label: "Próximos pasos", icon: Calendar, placeholder: "Seguimiento, controles...", multiline: true },
] as const;

type FieldKey = typeof OPTIONAL_FIELDS[number]["key"];

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
  const [activeFields, setActiveFields] = useState<Set<FieldKey>>(new Set());
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [addFieldOpen, setAddFieldOpen] = useState(false);

  // Available fields to add (not yet active)
  const availableFields = useMemo(
    () => OPTIONAL_FIELDS.filter((f) => !activeFields.has(f.key)),
    [activeFields]
  );

  const addField = (key: FieldKey) => {
    setActiveFields((prev) => new Set(prev).add(key));
    setAddFieldOpen(false);
  };

  const removeField = (key: FieldKey) => {
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
      });
      toast.success("Visita registrada");
      utils.visits.listByPet.invalidate({ petId });
      utils.pets.getProfile.invalidate({ id: petId });
      setLocation(`/historial/${result.id}`);
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
        <Button variant="ghost" onClick={() => setLocation("/pacientes")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
        <p className="text-muted-foreground mt-8 text-center">Paciente no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLocation(`/pacientes/${petId}`)}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al perfil
      </Button>

      {/* ── PATIENT HEADER (auto-filled) ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary/20">
              <AvatarImage src={pet.photoUrl ?? undefined} alt={pet.name} className="object-cover" />
              <AvatarFallback className="text-xl bg-primary/10">
                {speciesEmoji(pet.species)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold font-display">{pet.name}</h2>
                <Badge variant="secondary" className="capitalize text-xs">
                  {pet.species}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {pet.breed && `${pet.breed} · `}
                Dueño: {pet.ownerName}
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
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Fecha y hora *
              </Label>
              <Input
                type="datetime-local"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Reason (always visible, required) */}
          <div>
            <Label className="flex items-center gap-1.5 mb-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Motivo de consulta *
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="¿Por qué vino el paciente?"
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Free-text clinical notes (always visible) */}
          <div>
            <Label className="flex items-center gap-1.5 mb-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Notas clínicas
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas libres: observaciones, examen físico, comentarios..."
              rows={4}
              className="resize-y"
            />
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
                      <button
                        onClick={() => removeField(field.key)}
                        className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Quitar campo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {"multiline" in field && field.multiline ? (
                      <Textarea
                        value={fieldValues[field.key] ?? ""}
                        onChange={(e) => setFieldValue(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        className="resize-y"
                      />
                    ) : (
                      <Input
                        value={fieldValues[field.key] ?? ""}
                        onChange={(e) => setFieldValue(field.key, e.target.value)}
                        placeholder={field.placeholder}
                      />
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
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-dashed gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                  Agregar campo
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="center">
                <div className="space-y-0.5">
                  {availableFields.map((field) => (
                    <button
                      key={field.key}
                      onClick={() => addField(field.key)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors text-left"
                    >
                      <field.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{field.label}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          <Separator />

          {/* Submit */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setLocation(`/pacientes/${petId}`)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createVisitMut.isPending || !reason.trim()}
              className="gap-2"
            >
              {createVisitMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar visita
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
