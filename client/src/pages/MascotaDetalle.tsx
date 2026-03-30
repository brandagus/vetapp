import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  PawPrint,
  Edit2,
  Save,
  X,
  Plus,
  ChevronRight,
  Upload,
  Calendar,
  Weight,
  Dna,
  Trash2,
  ClipboardList,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInYears, differenceInMonths } from "date-fns";
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

const petSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  species: z.string().min(1),
  breed: z.string().optional(),
  birthDate: z.string().optional(),
  sex: z.enum(["macho", "hembra", "desconocido"]).optional(),
  color: z.string().optional(),
  weight: z.string().optional(),
  microchip: z.string().optional(),
  notes: z.string().optional(),
});
type PetForm = z.infer<typeof petSchema>;

const speciesOptions = ["Perro", "Gato", "Conejo", "Ave", "Reptil", "Otro"];

function getAge(birthDate: string | Date | null | undefined): string {
  if (!birthDate) return "Edad desconocida";
  const bd = new Date(birthDate);
  const years = differenceInYears(new Date(), bd);
  if (years > 0) return `${years} año${years !== 1 ? "s" : ""}`;
  const months = differenceInMonths(new Date(), bd);
  return `${months} mes${months !== 1 ? "es" : ""}`;
}

export default function MascotaDetalle() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const petId = parseInt(id ?? "0");

  const { data: pet, isLoading } = trpc.pets.getById.useQuery({ id: petId });
  const { data: visits } = trpc.visits.listByPet.useQuery({ petId });

  const updateMutation = trpc.pets.update.useMutation({
    onSuccess: () => {
      utils.pets.getById.invalidate({ id: petId });
      setIsEditing(false);
      toast.success("Mascota actualizada");
    },
    onError: () => toast.error("Error al actualizar"),
  });

  const deleteMutation = trpc.pets.delete.useMutation({
    onSuccess: () => {
      utils.pets.list.invalidate();
      setLocation("/mascotas");
      toast.success("Mascota eliminada");
    },
  });

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<PetForm>({
    resolver: zodResolver(petSchema),
    values: pet
      ? {
          name: pet.name,
          species: pet.species,
          breed: pet.breed ?? "",
          birthDate: pet.birthDate ? format(new Date(pet.birthDate), "yyyy-MM-dd") : "",
          sex: pet.sex ?? "desconocido",
          color: pet.color ?? "",
          weight: pet.weight?.toString() ?? "",
          microchip: pet.microchip ?? "",
          notes: pet.notes ?? "",
        }
      : undefined,
  });

  const uploadPhotoMutation = trpc.pets.uploadPhoto.useMutation({
    onSuccess: () => {
      utils.pets.getById.invalidate({ id: petId });
      toast.success("Foto actualizada");
    },
    onError: () => toast.error("Error al subir la foto"),
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La foto no puede superar 5MB");
      return;
    }
    setUploadingPhoto(true);
    try {
      const { fileToBase64 } = await import("../lib/uploadFile");
      const base64 = await fileToBase64(file);
      await uploadPhotoMutation.mutateAsync({
        petId,
        fileName: file.name,
        mimeType: file.type,
        fileBase64: base64,
      });
    } catch {
      toast.error("Error al subir la foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onSubmit = (data: PetForm) => {
    updateMutation.mutate({ id: petId, ...data });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Mascota no encontrada</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/mascotas")}>
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Back + actions */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/mascotas")} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Mascotas
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
                    <AlertDialogTitle>¿Eliminar mascota?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground"
                      onClick={() => deleteMutation.mutate({ id: petId })}
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

      {/* Pet profile card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            {/* Photo */}
            <div className="relative shrink-0">
              {pet.photoUrl ? (
                <img
                  src={pet.photoUrl}
                  alt={pet.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-border"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center border-2 border-border">
                  <PawPrint className="h-8 w-8 text-secondary-foreground" />
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                title="Cambiar foto"
              >
                <Upload className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            {/* Basic info */}
            {!isEditing ? (
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold font-display">{pet.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {pet.species}{pet.breed ? ` · ${pet.breed}` : ""}
                </p>
                {pet.ownerName && (
                  <button
                    className="text-xs text-primary mt-1 hover:underline"
                    onClick={() => setLocation(`/propietarios/${pet.ownerId}`)}
                  >
                    Dueño: {pet.ownerName}
                  </button>
                )}
                <div className="flex flex-wrap gap-3 mt-3">
                  {pet.birthDate && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      <Calendar className="h-3 w-3" />
                      {getAge(pet.birthDate)}
                    </span>
                  )}
                  {pet.weight && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      <Weight className="h-3 w-3" />
                      {pet.weight} kg
                    </span>
                  )}
                  {pet.sex && pet.sex !== "desconocido" && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full capitalize">
                      {pet.sex}
                    </span>
                  )}
                  {pet.microchip && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      <Dna className="h-3 w-3" />
                      {pet.microchip}
                    </span>
                  )}
                </div>
                {pet.notes && (
                  <p className="text-xs text-muted-foreground mt-2 italic">{pet.notes}</p>
                )}
              </div>
            ) : (
              <div className="flex-1 min-w-0 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre *</Label>
                    <Input {...register("name")} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Especie</Label>
                    <Controller
                      name="species"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {speciesOptions.map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Raza</Label>
                    <Input {...register("breed")} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Sexo</Label>
                    <Controller
                      name="sex"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="macho">Macho</SelectItem>
                            <SelectItem value="hembra">Hembra</SelectItem>
                            <SelectItem value="desconocido">Desconocido</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Fecha nac.</Label>
                    <Input type="date" {...register("birthDate")} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Peso (kg)</Label>
                    <Input type="number" step="0.1" {...register("weight")} className="h-8 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Color</Label>
                    <Input {...register("color")} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Microchip</Label>
                    <Input {...register("microchip")} className="h-8 text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Notas</Label>
                  <Textarea {...register("notes")} rows={2} className="text-sm" />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Visit history */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Historial clínico ({visits?.length ?? 0})
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLocation(`/historial?petId=${petId}`)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Nueva visita
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {!visits || visits.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Sin visitas registradas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visits.map(visit => (
                <div
                  key={visit.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => setLocation(`/historial/visita/${visit.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{visit.reason}</p>
                    {visit.diagnosis && (
                      <p className="text-xs text-muted-foreground truncate">{visit.diagnosis}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(visit.visitDate), "d 'de' MMMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
