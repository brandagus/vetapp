import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { PawPrint, Search, Plus, ChevronRight, User, Phone } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const petSchema = z.object({
  ownerId: z.number().min(1, "Seleccioná un propietario"),
  name: z.string().min(1, "El nombre es requerido"),
  species: z.string().min(1, "La especie es requerida"),
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

function speciesEmoji(species: string): string {
  const s = species.toLowerCase();
  if (s.includes("perro") || s.includes("can")) return "🐕";
  if (s.includes("gato") || s.includes("felin")) return "🐈";
  if (s.includes("ave") || s.includes("pájaro") || s.includes("pajaro")) return "🐦";
  if (s.includes("conejo")) return "🐇";
  if (s.includes("reptil")) return "🦎";
  return "🐾";
}

export default function Mascotas() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const preselectedOwnerId = params.get("ownerId") ? parseInt(params.get("ownerId")!) : undefined;

  const [searchText, setSearchText] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(!!preselectedOwnerId);
  const utils = trpc.useUtils();

  const { data: pets, isLoading } = trpc.pets.list.useQuery(undefined);
  const { data: owners } = trpc.owners.list.useQuery(undefined);

  const createMutation = trpc.pets.create.useMutation({
    onSuccess: (data) => {
      utils.pets.list.invalidate();
      setShowCreate(false);
      reset();
      toast.success("Paciente registrado");
      setLocation(`/pacientes/${data.id}`);
    },
    onError: () => toast.error("Error al registrar"),
  });

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<PetForm>({
    resolver: zodResolver(petSchema),
    defaultValues: {
      ownerId: preselectedOwnerId,
      sex: "desconocido",
    },
  });

  const onSubmit = (data: PetForm) => {
    createMutation.mutate(data);
  };

  // Get unique species for filter chips
  const speciesList = useMemo(() => {
    if (!pets) return [];
    const set = new Set(pets.map((p) => p.species));
    return Array.from(set).sort();
  }, [pets]);

  // Filter
  const filteredPets = useMemo(() => {
    if (!pets) return [];
    return pets.filter((pet) => {
      const matchesSearch =
        !searchText ||
        pet.name.toLowerCase().includes(searchText.toLowerCase()) ||
        pet.species.toLowerCase().includes(searchText.toLowerCase()) ||
        (pet.breed ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
        (pet.ownerName ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
        (pet.ownerPhone ?? "").includes(searchText);
      const matchesSpecies = !speciesFilter || pet.species === speciesFilter;
      return matchesSearch && matchesSpecies;
    });
  }, [pets, searchText, speciesFilter]);

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <PawPrint className="h-6 w-6 text-primary" />
            Pacientes
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filteredPets.length} de {pets?.length ?? 0} pacientes
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
          placeholder="Buscar por nombre, raza, familiar o teléfono..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Species filter chips */}
      {speciesList.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={speciesFilter === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSpeciesFilter(null)}
          >
            Todos
          </Badge>
          {speciesList.map((sp) => (
            <Badge
              key={sp}
              variant={speciesFilter === sp ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSpeciesFilter(speciesFilter === sp ? null : sp)}
            >
              {speciesEmoji(sp)} {sp}
            </Badge>
          ))}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : filteredPets.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <PawPrint className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No se encontraron pacientes</p>
          <p className="text-sm mt-1">
            {searchText || speciesFilter ? "Probá con otro filtro" : "Registrá el primer paciente"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPets.map((pet) => (
            <Card
              key={pet.id}
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
              onClick={() => setLocation(`/pacientes/${pet.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-border shrink-0">
                    <AvatarImage src={pet.photoUrl ?? undefined} alt={pet.name} className="object-cover" />
                    <AvatarFallback className="text-lg bg-primary/10">
                      {speciesEmoji(pet.species)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{pet.name}</p>
                      <Badge variant="secondary" className="text-xs capitalize shrink-0">
                        {pet.species}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pet.breed && `${pet.breed} · `}
                      {pet.sex && pet.sex !== "desconocido" ? `${pet.sex === "macho" ? "♂" : "♀"} · ` : ""}
                      {pet.weight ? `${pet.weight} kg` : ""}
                    </p>
                    {pet.ownerName && (
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" /> {pet.ownerName}
                        </span>
                        {pet.ownerPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {pet.ownerPhone}
                          </span>
                        )}
                      </div>
                    )}
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
            <DialogTitle>Nuevo paciente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Owner */}
            <div className="space-y-1.5">
              <Label>Familiar *</Label>
              <Controller
                name="ownerId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value?.toString()}
                    onValueChange={(v) => field.onChange(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccioná un familiar" />
                    </SelectTrigger>
                    <SelectContent>
                      {owners?.map((o) => (
                        <SelectItem key={o.id} value={o.id.toString()}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.ownerId && (
                <p className="text-xs text-destructive">{errors.ownerId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input {...register("name")} placeholder="Ej: Firulais" />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Especie *</Label>
                <Controller
                  name="species"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Especie" />
                      </SelectTrigger>
                      <SelectContent>
                        {speciesOptions.map((s) => (
                          <SelectItem key={s} value={s}>
                            {speciesEmoji(s)} {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.species && (
                  <p className="text-xs text-destructive">{errors.species.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Raza</Label>
                <Input {...register("breed")} placeholder="Ej: Labrador" />
              </div>
              <div className="space-y-1.5">
                <Label>Sexo</Label>
                <Controller
                  name="sex"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="macho">♂ Macho</SelectItem>
                        <SelectItem value="hembra">♀ Hembra</SelectItem>
                        <SelectItem value="desconocido">Desconocido</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha de nacimiento</Label>
                <Input type="date" {...register("birthDate")} />
              </div>
              <div className="space-y-1.5">
                <Label>Peso (kg)</Label>
                <Input {...register("weight")} placeholder="Ej: 5.2" type="number" step="0.1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Color</Label>
                <Input {...register("color")} placeholder="Ej: Negro y blanco" />
              </div>
              <div className="space-y-1.5">
                <Label>Microchip</Label>
                <Input {...register("microchip")} placeholder="Número de chip" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea
                {...register("notes")}
                placeholder="Observaciones, alergias, etc."
                rows={2}
              />
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
