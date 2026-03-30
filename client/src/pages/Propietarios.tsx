import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users, Search, Plus, Phone, Mail, MapPin, PawPrint, ChevronRight, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const ownerSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});
type OwnerForm = z.infer<typeof ownerSchema>;

export default function Propietarios() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const utils = trpc.useUtils();

  const { data: owners, isLoading } = trpc.owners.list.useQuery(
    search ? { search } : undefined
  );

  const createMutation = trpc.owners.create.useMutation({
    onSuccess: () => {
      utils.owners.list.invalidate();
      setShowCreate(false);
      reset();
      toast.success("Propietario creado correctamente");
    },
    onError: () => toast.error("Error al crear el propietario"),
  });

  const deleteMutation = trpc.owners.delete.useMutation({
    onSuccess: () => {
      utils.owners.list.invalidate();
      toast.success("Propietario eliminado");
    },
    onError: () => toast.error("Error al eliminar"),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<OwnerForm>({
    resolver: zodResolver(ownerSchema),
  });

  const onSubmit = (data: OwnerForm) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Propietarios
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {owners?.length ?? 0} propietarios registrados
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" />
          Nuevo
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, teléfono o email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : owners?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No se encontraron propietarios</p>
          <p className="text-sm mt-1">
            {search ? "Probá con otro término de búsqueda" : "Creá el primer propietario"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {owners?.map(owner => (
            <Card
              key={owner.id}
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
              onClick={() => setLocation(`/propietarios/${owner.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold text-sm">
                      {owner.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{owner.name}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      {owner.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {owner.phone}
                        </span>
                      )}
                      {owner.email && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {owner.email}
                        </span>
                      )}
                      {owner.address && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 truncate max-w-[200px]">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {owner.address}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo propietario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre completo *</Label>
              <Input id="name" {...register("name")} placeholder="Ej: María González" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" {...register("phone")} placeholder="+54 11 1234-5678" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} placeholder="correo@ejemplo.com" />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" {...register("address")} placeholder="Calle, número, ciudad" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" {...register("notes")} placeholder="Observaciones adicionales..." rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
