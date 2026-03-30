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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ClipboardList, Plus, ChevronRight, PawPrint, Search } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const visitSchema = z.object({
  petId: z.number().min(1, "Seleccioná una mascota"),
  ownerId: z.number().min(1, "Seleccioná un propietario"),
  visitDate: z.string().min(1, "La fecha es requerida"),
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

export default function Historial() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const preselectedPetId = params.get("petId") ? parseInt(params.get("petId")!) : undefined;

  const [searchText, setSearchText] = useState("");
  const [showCreate, setShowCreate] = useState(!!preselectedPetId);
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | undefined>();
  const utils = trpc.useUtils();

  const { data: visits, isLoading } = trpc.visits.listRecent.useQuery({ limit: 50 });
  const { data: owners } = trpc.owners.list.useQuery(undefined);
  const { data: pets } = trpc.pets.list.useQuery(
    selectedOwnerId ? { ownerId: selectedOwnerId } : undefined
  );

  const createMutation = trpc.visits.create.useMutation({
    onSuccess: (data) => {
      utils.visits.listRecent.invalidate();
      setShowCreate(false);
      reset();
      toast.success("Visita registrada");
      setLocation(`/historial/visita/${data.id}`);
    },
    onError: () => toast.error("Error al registrar la visita"),
  });

  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<VisitForm>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      petId: preselectedPetId,
      visitDate: new Date().toISOString().slice(0, 16),
    },
  });

  const onSubmit = (data: VisitForm) => {
    createMutation.mutate(data);
  };

  const filteredVisits = visits?.filter(v =>
    !searchText ||
    (v.petName ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
    (v.ownerName ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
    (v.reason ?? "").toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Historial Clínico
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filteredVisits?.length ?? 0} visitas registradas
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" />
          Nueva visita
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por mascota, propietario o motivo..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filteredVisits?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No se encontraron visitas</p>
          <p className="text-sm mt-1">
            {searchText ? "Probá con otro término" : "Registrá la primera visita"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredVisits?.map(visit => (
            <Card
              key={visit.id}
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
              onClick={() => setLocation(`/historial/visita/${visit.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <PawPrint className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">
                        {visit.petName ?? "Mascota"}
                      </p>
                      {visit.petSpecies && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {visit.petSpecies}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {visit.ownerName ?? "Propietario"} ·{" "}
                      {format(new Date(visit.visitDate), "d 'de' MMMM yyyy", { locale: es })}
                    </p>
                    <p className="text-xs text-foreground/70 truncate mt-0.5">{visit.reason}</p>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva visita clínica</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Owner */}
            <div className="space-y-1.5">
              <Label>Propietario *</Label>
              <Select
                onValueChange={v => {
                  const id = parseInt(v);
                  setSelectedOwnerId(id);
                  setValue("ownerId", id);
                  setValue("petId", 0);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná un propietario" />
                </SelectTrigger>
                <SelectContent>
                  {owners?.map(o => (
                    <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.ownerId && <p className="text-xs text-destructive">{errors.ownerId.message}</p>}
            </div>

            {/* Pet */}
            <div className="space-y-1.5">
              <Label>Mascota *</Label>
              <Controller
                name="petId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value?.toString()}
                    onValueChange={v => field.onChange(parseInt(v))}
                    disabled={!selectedOwnerId && !preselectedPetId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedOwnerId ? "Seleccioná una mascota" : "Primero seleccioná un propietario"} />
                    </SelectTrigger>
                    <SelectContent>
                      {pets?.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name} ({p.species})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.petId && <p className="text-xs text-destructive">{errors.petId.message}</p>}
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label>Fecha y hora *</Label>
              <Input type="datetime-local" {...register("visitDate")} />
              {errors.visitDate && <p className="text-xs text-destructive">{errors.visitDate.message}</p>}
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label>Motivo de consulta *</Label>
              <Input {...register("reason")} placeholder="Ej: Control anual, vacunación, etc." />
              {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
            </div>

            {/* Diagnosis */}
            <div className="space-y-1.5">
              <Label>Diagnóstico</Label>
              <Textarea {...register("diagnosis")} placeholder="Diagnóstico clínico..." rows={2} />
            </div>

            {/* Treatment */}
            <div className="space-y-1.5">
              <Label>Tratamiento</Label>
              <Textarea {...register("treatment")} placeholder="Tratamiento indicado..." rows={2} />
            </div>

            {/* Medications */}
            <div className="space-y-1.5">
              <Label>Medicamentos</Label>
              <Textarea {...register("medications")} placeholder="Medicamentos, dosis y frecuencia..." rows={2} />
            </div>

            {/* Next steps */}
            <div className="space-y-1.5">
              <Label>Próximos pasos</Label>
              <Textarea {...register("nextSteps")} placeholder="Indicaciones para el propietario, próxima consulta..." rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Peso (kg)</Label>
                <Input type="number" step="0.1" {...register("weight")} placeholder="Ej: 5.2" />
              </div>
              <div className="space-y-1.5">
                <Label>Temperatura (°C)</Label>
                <Input type="number" step="0.1" {...register("temperature")} placeholder="Ej: 38.5" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notas adicionales</Label>
              <Textarea {...register("notes")} placeholder="Observaciones..." rows={2} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Guardando..." : "Guardar visita"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
