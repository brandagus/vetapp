import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Paperclip,
  Upload,
  FileText,
  Image,
  Trash2,
  PawPrint,
  Calendar,
  Stethoscope,
  Pill,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const visitSchema = z.object({
  visitDate: z.string().optional(),
  reason: z.string().min(1, "El motivo es requerido"),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  medications: z.string().optional(),
  nextSteps: z.string().optional(),
  weight: z.string().optional(),
  temperature: z.string().optional(),
  notes: z.string().optional(),
});
type VisitForm = z.infer<typeof visitSchema>;

function AttachmentIcon({ mimeType }: { mimeType: string | null | undefined }) {
  if (mimeType?.startsWith("image/")) return <Image className="h-5 w-5 text-blue-500" />;
  return <FileText className="h-5 w-5 text-amber-500" />;
}

export default function VisitaDetalle() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const visitId = parseInt(id ?? "0");

  const { data: visit, isLoading } = trpc.visits.getById.useQuery({ id: visitId });

  const updateMutation = trpc.visits.update.useMutation({
    onSuccess: () => {
      utils.visits.getById.invalidate({ id: visitId });
      setIsEditing(false);
      toast.success("Visita actualizada");
    },
    onError: () => toast.error("Error al actualizar"),
  });

  const deleteMutation = trpc.visits.delete.useMutation({
    onSuccess: () => {
      utils.visits.listRecent.invalidate();
      setLocation("/historial");
      toast.success("Visita eliminada");
    },
  });

  const deleteAttachmentMutation = trpc.visits.deleteAttachment.useMutation({
    onSuccess: () => {
      utils.visits.getById.invalidate({ id: visitId });
      toast.success("Archivo eliminado");
    },
  });

  const uploadMutation = trpc.visits.uploadAttachment.useMutation({
    onSuccess: () => {
      utils.visits.getById.invalidate({ id: visitId });
      toast.success("Archivo subido correctamente");
    },
    onError: () => toast.error("Error al subir el archivo"),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<VisitForm>({
    resolver: zodResolver(visitSchema),
    values: visit
      ? {
          visitDate: visit.visitDate
            ? format(new Date(visit.visitDate), "yyyy-MM-dd'T'HH:mm")
            : "",
          reason: visit.reason,
          diagnosis: visit.diagnosis ?? "",
          treatment: visit.treatment ?? "",
          medications: visit.medications ?? "",
          nextSteps: visit.nextSteps ?? "",
          weight: visit.weight?.toString() ?? "",
          temperature: visit.temperature?.toString() ?? "",
          notes: visit.notes ?? "",
        }
      : undefined,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} supera el límite de 10MB`);
        continue;
      }
      setUploading(true);
      try {
        const reader = new FileReader();
        await new Promise<void>((resolve, reject) => {
          reader.onload = async () => {
            const base64 = (reader.result as string).split(",")[1];
            await uploadMutation.mutateAsync({
              visitId,
              fileName: file.name,
              mimeType: file.type,
              fileSize: file.size,
              fileBase64: base64,
            });
            resolve();
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } catch {
        toast.error(`Error al subir ${file.name}`);
      } finally {
        setUploading(false);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = (data: VisitForm) => {
    updateMutation.mutate({ id: visitId, ...data });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Visita no encontrada</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/historial")}>
          Volver
        </Button>
      </div>
    );
  }

  const attachments = visit.attachments ?? [];

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Back + actions */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/historial")} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Historial
        </Button>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-1.5" />
                Editar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar visita?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminarán también todos los archivos adjuntos. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground"
                      onClick={() => deleteMutation.mutate({ id: visitId })}
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); reset(); }}>
                <X className="h-4 w-4 mr-1.5" />
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSubmit(onSubmit)} disabled={updateMutation.isPending}>
                <Save className="h-4 w-4 mr-1.5" />
                {updateMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Visit header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Stethoscope className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base">
                {visit.reason}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(visit.visitDate), "EEEE d 'de' MMMM yyyy, HH:mm", { locale: es })}
              </p>
              <div className="flex gap-2 mt-2">
                {visit.weight && (
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                    Peso: {visit.weight} kg
                  </span>
                )}
                {visit.temperature && (
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                    Temp: {visit.temperature}°C
                  </span>
                )}
              </div>
            </div>
          </div>

          <Separator className="mb-4" />

          {isEditing ? (
            <form className="space-y-4">
              <div className="space-y-1.5">
                <Label>Fecha y hora</Label>
                <Input type="datetime-local" {...register("visitDate")} />
              </div>
              <div className="space-y-1.5">
                <Label>Motivo *</Label>
                <Input {...register("reason")} />
                {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Diagnóstico</Label>
                <Textarea {...register("diagnosis")} rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label>Tratamiento</Label>
                <Textarea {...register("treatment")} rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label>Medicamentos</Label>
                <Textarea {...register("medications")} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Próximos pasos</Label>
                <Textarea {...register("nextSteps")} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Peso (kg)</Label>
                  <Input type="number" step="0.1" {...register("weight")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Temperatura (°C)</Label>
                  <Input type="number" step="0.1" {...register("temperature")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notas</Label>
                <Textarea {...register("notes")} rows={2} />
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {visit.diagnosis && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Diagnóstico
                  </h4>
                  <p className="text-sm">{visit.diagnosis}</p>
                </div>
              )}
              {visit.treatment && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Tratamiento
                  </h4>
                  <p className="text-sm">{visit.treatment}</p>
                </div>
              )}
              {visit.medications && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Pill className="h-3.5 w-3.5" />
                    Medicamentos
                  </h4>
                  <p className="text-sm whitespace-pre-line">{visit.medications}</p>
                </div>
              )}
              {visit.nextSteps && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Próximos pasos
                  </h4>
                  <p className="text-sm whitespace-pre-line">{visit.nextSteps}</p>
                </div>
              )}
              {visit.notes && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Notas
                  </h4>
                  <p className="text-sm text-muted-foreground italic">{visit.notes}</p>
                </div>
              )}
              {!visit.diagnosis && !visit.treatment && !visit.medications && !visit.nextSteps && !visit.notes && (
                <p className="text-sm text-muted-foreground italic">Sin detalles clínicos registrados</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attachments */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-primary" />
              Archivos adjuntos ({attachments.length})
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-1.5" />
              {uploading ? "Subiendo..." : "Subir archivo"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {attachments.length === 0 ? (
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">
                Arrastrá archivos o hacé clic para subir
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Fotos, PDFs, resultados de laboratorio (máx. 10MB)
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {attachments.map(att => (
                <div
                  key={att.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted transition-colors"
                >
                  <AttachmentIcon mimeType={att.mimeType} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{att.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {att.fileSize ? `${(att.fileSize / 1024).toFixed(0)} KB · ` : ""}
                      {format(new Date(att.createdAt), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => window.open(att.fileUrl, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se eliminará "{att.fileName}" permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground"
                            onClick={() => deleteAttachmentMutation.mutate({ id: att.id })}
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
              <button
                className="w-full mt-2 p-2 text-xs text-muted-foreground border border-dashed border-border rounded-lg hover:border-primary/40 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                + Agregar más archivos
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
