import { useState } from "react";
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
  Phone,
  Mail,
  MapPin,
  PawPrint,
  Edit2,
  Save,
  X,
  Plus,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

const ownerSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});
type OwnerForm = z.infer<typeof ownerSchema>;

export default function PropietarioDetalle() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const utils = trpc.useUtils();
  const ownerId = parseInt(id ?? "0");

  const { data: owner, isLoading } = trpc.owners.getById.useQuery({ id: ownerId });
  const { data: pets } = trpc.pets.list.useQuery({ ownerId });

  const updateMutation = trpc.owners.update.useMutation({
    onSuccess: () => {
      utils.owners.getById.invalidate({ id: ownerId });
      setIsEditing(false);
      toast.success("Propietario actualizado");
    },
    onError: () => toast.error("Error al actualizar"),
  });

  const deleteMutation = trpc.owners.delete.useMutation({
    onSuccess: () => {
      utils.owners.list.invalidate();
      setLocation("/propietarios");
      toast.success("Propietario eliminado");
    },
    onError: () => toast.error("Error al eliminar"),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<OwnerForm>({
    resolver: zodResolver(ownerSchema),
    values: owner
      ? {
          name: owner.name,
          phone: owner.phone ?? "",
          email: owner.email ?? "",
          address: owner.address ?? "",
          notes: owner.notes ?? "",
        }
      : undefined,
  });

  const onSubmit = (data: OwnerForm) => {
    updateMutation.mutate({ id: ownerId, ...data });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Propietario no encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/propietarios")}>
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Back + actions */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/propietarios")}
          className="-ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Propietarios
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
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar propietario?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Se eliminará el propietario y todos sus datos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => deleteMutation.mutate({ id: ownerId })}
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

      {/* Owner info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-lg">
                {owner.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <CardTitle className="text-lg">{owner.name}</CardTitle>
              <p className="text-xs text-muted-foreground">Propietario</p>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          {isEditing ? (
            <form className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nombre completo *</Label>
                <Input {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Teléfono</Label>
                  <Input {...register("phone")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" {...register("email")} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Dirección</Label>
                <Input {...register("address")} />
              </div>
              <div className="space-y-1.5">
                <Label>Notas</Label>
                <Textarea {...register("notes")} rows={3} />
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {owner.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{owner.phone}</span>
                </div>
              )}
              {owner.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{owner.email}</span>
                </div>
              )}
              {owner.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{owner.address}</span>
                </div>
              )}
              {owner.notes && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  {owner.notes}
                </div>
              )}
              {!owner.phone && !owner.email && !owner.address && !owner.notes && (
                <p className="text-sm text-muted-foreground italic">Sin información de contacto registrada</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pets */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <PawPrint className="h-4 w-4 text-primary" />
              Mascotas ({pets?.length ?? 0})
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLocation(`/mascotas?ownerId=${ownerId}`)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {!pets || pets.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <PawPrint className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Sin mascotas registradas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pets.map(pet => (
                <div
                  key={pet.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => setLocation(`/mascotas/${pet.id}`)}
                >
                  {pet.photoUrl ? (
                    <img
                      src={pet.photoUrl}
                      alt={pet.name}
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <PawPrint className="h-4 w-4 text-secondary-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{pet.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pet.species}{pet.breed ? ` — ${pet.breed}` : ""}
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
