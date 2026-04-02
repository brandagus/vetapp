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
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, X, Calendar, Stethoscope, Weight, Thermometer,
  Heart, Activity, FileText, Save, Loader2, Eye, Droplets, CircleDot, Smile,
  Mic, ChevronDown, Sparkles, Upload, Camera, Image as ImageIcon, Trash2,
} from "lucide-react";
import { useState, useMemo, useCallback, useRef } from "react";
import AudioRecorder from "@/components/AudioRecorder";
import { fileToBase64 } from "@/lib/uploadFile";

// ── All optional fields with types ──
type FieldDef = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
  type: "text" | "textarea" | "select" | "photo";
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
  // Foto clínica
  { key: "photo", label: "Foto clínica", icon: Camera, placeholder: "", type: "photo" },
];

const FIELD_GROUPS = [
  { title: "Signos vitales", keys: ["weight", "temperature", "heartRate", "respRate", "bodyCondition"] },
  { title: "Examen físico", keys: ["mucosas", "hydration", "lymphNodes", "dentalStatus"] },
  { title: "Clínico", keys: ["diagnosis", "treatment", "medications", "nextSteps"] },
  { title: "Multimedia", keys: ["photo"] },
];

// Map from LLM extraction keys to form field keys
const EXTRACTION_MAP: Record<string, string> = {
  reason: "_reason",
  diagnosis: "diagnosis",
  treatment: "treatment",
  medications: "medications",
  nextSteps: "nextSteps",
  weight: "weight",
  temperature: "temperature",
  heartRate: "heartRate",
  respRate: "respRate",
  bodyCondition: "bodyCondition",
  mucosas: "mucosas",
  hydration: "hydration",
  lymphNodes: "lymphNodes",
  dentalStatus: "dentalStatus",
  notes: "_notes",
};

type PhotoEntry = {
  file: File;
  previewUrl: string;
  base64: string;
  description: string;
};

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
  const uploadAttachmentMut = trpc.visits.uploadAttachment.useMutation();
  const processAudioMut = trpc.voice.processAudio.useMutation();
  const utils = trpc.useUtils();

  // Form state
  const [visitDate, setVisitDate] = useState(nowLocalISO());
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [activeFields, setActiveFields] = useState<Set<string>>(new Set());
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [addFieldOpen, setAddFieldOpen] = useState(false);

  // Audio state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioTranscription, setAudioTranscription] = useState<string | null>(null);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);
  const [fieldsAutoPopulated, setFieldsAutoPopulated] = useState(false);

  // Photo state
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Voice file upload ref
  const voiceFileInputRef = useRef<HTMLInputElement>(null);

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
    if (key === "photo") {
      setPhotos([]);
    }
  };

  const setFieldValue = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  // Apply extracted fields from AI
  const applyExtractedFields = useCallback((extracted: Record<string, unknown>) => {
    const newActiveFields = new Set(activeFields);
    const newFieldValues = { ...fieldValues };

    for (const [extractKey, value] of Object.entries(extracted)) {
      if (value === null || value === undefined || value === "") continue;

      const formKey = EXTRACTION_MAP[extractKey];
      if (!formKey) continue;

      const strValue = typeof value === "number" ? String(value) : String(value);

      if (formKey === "_reason") {
        if (!reason.trim()) setReason(strValue);
      } else if (formKey === "_notes") {
        // Always set notes from AI (Wispr-style improved version)
        setNotes(strValue);
      } else {
        newActiveFields.add(formKey);
        newFieldValues[formKey] = strValue;
      }
    }

    setActiveFields(newActiveFields);
    setFieldValues(newFieldValues);
    setFieldsAutoPopulated(true);
  }, [activeFields, fieldValues, reason]);

  // Handle audio recording completion (live recording)
  const handleRecordingComplete = useCallback(async (audioBase64: string, mimeType: string) => {
    if (!pet) return;
    setIsProcessingAudio(true);

    try {
      const result = await processAudioMut.mutateAsync({
        audioBase64,
        mimeType,
        petName: pet.name,
        ownerName: pet.ownerName ?? undefined,
      });

      setAudioUrl(result.audioUrl);
      setAudioTranscription(result.transcription);

      const extracted = result.extractedFields as Record<string, unknown>;
      if (extracted) {
        applyExtractedFields(extracted);
      }

      toast.success("Audio procesado. Los campos se completaron automáticamente.", {
        description: "Revisá los datos y ajustá lo que sea necesario.",
        duration: 5000,
      });
    } catch (err) {
      console.error("Error processing audio:", err);
      toast.error("Error al procesar el audio. Intentá de nuevo.");
    } finally {
      setIsProcessingAudio(false);
    }
  }, [pet, processAudioMut, applyExtractedFields]);

  // Handle voice file upload (pre-recorded)
  const handleVoiceFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pet) return;

    // Reset input
    if (voiceFileInputRef.current) voiceFileInputRef.current.value = "";

    // Validate size (16MB)
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 16) {
      toast.error(`El archivo es demasiado grande (${sizeMB.toFixed(1)}MB). El máximo es 16MB.`);
      return;
    }

    // Validate type
    const validTypes = ["audio/webm", "audio/mp3", "audio/mpeg", "audio/wav", "audio/ogg", "audio/m4a", "audio/mp4", "audio/x-m4a", "audio/aac", "video/mp4"];
    if (!validTypes.some(t => file.type.startsWith(t.split("/")[0]))) {
      toast.error("Formato no soportado. Usá archivos de audio (mp3, m4a, wav, ogg, webm).");
      return;
    }

    setIsProcessingAudio(true);

    try {
      const base64 = await fileToBase64(file);
      const mimeType = file.type || "audio/mpeg";

      const result = await processAudioMut.mutateAsync({
        audioBase64: base64,
        mimeType,
        petName: pet.name,
        ownerName: pet.ownerName ?? undefined,
      });

      setAudioUrl(result.audioUrl);
      setAudioTranscription(result.transcription);

      const extracted = result.extractedFields as Record<string, unknown>;
      if (extracted) {
        applyExtractedFields(extracted);
      }

      toast.success("Nota de voz procesada. Los campos se completaron automáticamente.", {
        description: "Revisá los datos y ajustá lo que sea necesario.",
        duration: 5000,
      });
    } catch (err) {
      console.error("Error processing voice file:", err);
      toast.error("Error al procesar la nota de voz. Intentá de nuevo.");
    } finally {
      setIsProcessingAudio(false);
    }
  }, [pet, processAudioMut, applyExtractedFields]);

  // Handle photo selection
  const handlePhotoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Reset input so same file can be selected again
    const inputEl = e.target;
    setTimeout(() => { inputEl.value = ""; }, 0);

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`"${file.name}" no es una imagen válida.`);
        continue;
      }
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > 10) {
        toast.error(`"${file.name}" es demasiado grande (${sizeMB.toFixed(1)}MB). Máximo 10MB.`);
        continue;
      }

      try {
        const base64 = await fileToBase64(file);
        const previewUrl = URL.createObjectURL(file);
        setPhotos(prev => [...prev, { file, previewUrl, base64, description: "" }]);
      } catch {
        toast.error(`Error al procesar "${file.name}".`);
      }
    }
  }, []);

  const updatePhotoDescription = (index: number, description: string) => {
    setPhotos(prev => prev.map((p, i) => i === index ? { ...p, description } : p));
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
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
        audioUrl: audioUrl ?? undefined,
        audioTranscription: audioTranscription ?? undefined,
      });

      // Upload photos as attachments
      for (const photo of photos) {
        const fileName = photo.description
          ? `${photo.description.slice(0, 50).replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]/g, "")}.${photo.file.name.split(".").pop()}`
          : photo.file.name;
        await uploadAttachmentMut.mutateAsync({
          visitId: result.id,
          fileName,
          mimeType: photo.file.type,
          fileSize: photo.file.size,
          fileBase64: photo.base64,
        });
      }

      toast.success("Visita guardada correctamente");
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

      {/* ── AUDIO RECORDER + UPLOAD ── */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Dictado por voz
            <Badge variant="secondary" className="text-xs font-normal gap-1">
              <Sparkles className="h-3 w-3" /> IA
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Grabá la consulta o subí una nota de voz y la IA completará los campos automáticamente
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <AudioRecorder
            onRecordingComplete={handleRecordingComplete}
            isProcessing={isProcessingAudio}
            existingAudioUrl={audioUrl}
            disabled={createVisitMut.isPending}
          />

          {/* Upload voice note button */}
          {!audioUrl && !isProcessingAudio && (
            <div className="flex items-center gap-3">
              <input
                ref={voiceFileInputRef}
                type="file"
                accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm,.aac,.mp4"
                className="hidden"
                onChange={handleVoiceFileUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => voiceFileInputRef.current?.click()}
                disabled={createVisitMut.isPending}
                className="w-full gap-2 border-dashed text-muted-foreground hover:text-foreground"
              >
                <Upload className="h-4 w-4" />
                Subir nota de voz
              </Button>
            </div>
          )}

          {/* Transcription collapsible */}
          {audioTranscription && (
            <Collapsible open={showTranscription} onOpenChange={setShowTranscription}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Ver transcripción original
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showTranscription ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-3 rounded-lg bg-white border text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {audioTranscription}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {fieldsAutoPopulated && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200">
              <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-700">
                Campos completados por IA. Revisá y ajustá lo que sea necesario antes de guardar.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── VISIT FORM ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Datos de la visita
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
              {fieldsAutoPopulated && reason && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-300">IA</Badge>
              )}
            </Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="¿Por qué vino el paciente?" rows={2} className="resize-none" />
          </div>

          {/* Free-text clinical notes (always visible) */}
          <div>
            <Label className="flex items-center gap-1.5 mb-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Notas clínicas
              {fieldsAutoPopulated && notes && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-300">IA</Badge>
              )}
            </Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas libres: observaciones, examen físico, comentarios..." rows={4} className="resize-y" />
          </div>

          {/* ── DYNAMIC OPTIONAL FIELDS ── */}
          {activeFields.size > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                {OPTIONAL_FIELDS.filter((f) => activeFields.has(f.key)).map((field) => {
                  // Photo field has special rendering
                  if (field.type === "photo") {
                    return (
                      <div key={field.key} className="group relative">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="flex items-center gap-1.5">
                            <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                            {field.label}
                          </Label>
                          <button onClick={() => removeField(field.key)} className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Quitar campo">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Photo list */}
                        {photos.length > 0 && (
                          <div className="space-y-3 mb-3">
                            {photos.map((photo, idx) => (
                              <div key={idx} className="flex gap-3 p-3 rounded-lg border bg-slate-50">
                                <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 border">
                                  <img src={photo.previewUrl} alt={photo.description || `Foto ${idx + 1}`} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <Input
                                    value={photo.description}
                                    onChange={(e) => updatePhotoDescription(idx, e.target.value)}
                                    placeholder="Descripción de la foto (ej: lesión en pata derecha)"
                                    className="h-9 text-sm"
                                  />
                                  <p className="text-xs text-muted-foreground truncate">{photo.file.name}</p>
                                </div>
                                <button
                                  onClick={() => removePhoto(idx)}
                                  className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 self-start"
                                  title="Eliminar foto"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add photo buttons */}
                        <div className="flex gap-2">
                          <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handlePhotoSelect}
                          />
                          <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handlePhotoSelect}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => cameraInputRef.current?.click()}
                            className="flex-1 gap-2"
                          >
                            <Camera className="h-4 w-4" />
                            Cámara
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => photoInputRef.current?.click()}
                            className="flex-1 gap-2"
                          >
                            <ImageIcon className="h-4 w-4" />
                            Galería
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  // Regular fields
                  return (
                    <div key={field.key} className="group relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <Label className="flex items-center gap-1.5">
                          <field.icon className="h-3.5 w-3.5 text-muted-foreground" />
                          {field.label}
                          {fieldsAutoPopulated && fieldValues[field.key] && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-300">IA</Badge>
                          )}
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
                  );
                })}
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
            <Button onClick={handleSubmit} disabled={createVisitMut.isPending || isProcessingAudio || !reason.trim()} className="gap-2">
              {createVisitMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar visita
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
