import { useState, useMemo, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  User,
  Search,
  Plus,
  X,
  Phone,
  Mail,
  MapPin,
  Save,
  Loader2,
} from "lucide-react";
import { useLocation } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const petSchema = z.object({
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

// ── New Owner inline form schema ──
const newOwnerSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});
type NewOwnerForm = z.infer<typeof newOwnerSchema>;

export default function NuevoPaciente() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // ── Owner selection state ──
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
  const [showNewOwnerForm, setShowNewOwnerForm] = useState(false);
  const ownerInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Data ──
  const { data: owners } = trpc.owners.list.useQuery(undefined);

  // ── Mutations ──
  const createPetMut = trpc.pets.create.useMutation({
    onSuccess: (data) => {
      utils.pets.list.invalidate();
      toast.success("Paciente registrado exitosamente");
      setLocation(`/pacientes/${data.id}`);
    },
    onError: () => toast.error("Error al registrar el paciente"),
  });

  const createOwnerMut = trpc.owners.create.useMutation({
    onSuccess: (data) => {
      utils.owners.list.invalidate();
      setSelectedOwnerId(data.id);
      setOwnerSearch(newOwner.name);
      setShowNewOwnerForm(false);
      setShowOwnerDropdown(false);
      toast.success(`Familiar "${newOwner.name}" creado`);
    },
    onError: () => toast.error("Error al crear el familiar"),
  });

  // ── Pet form ──
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PetForm>({
    resolver: zodResolver(petSchema),
    defaultValues: { sex: "desconocido" },
  });

  // ── New owner form ──
  const [newOwner, setNewOwner] = useState<NewOwnerForm>({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  // ── Filtered owners ──
  const filteredOwners = useMemo(() => {
    if (!owners) return [];
    if (!ownerSearch.trim()) return owners;
    const q = ownerSearch.toLowerCase();
    return owners.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.phone ?? "").includes(q) ||
        (o.email ?? "").toLowerCase().includes(q)
    );
  }, [owners, ownerSearch]);

  // ── Selected owner object ──
  const selectedOwner = useMemo(() => {
    if (!selectedOwnerId || !owners) return null;
    return owners.find((o) => o.id === selectedOwnerId) ?? null;
  }, [selectedOwnerId, owners]);

  // ── Close dropdown on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        ownerInputRef.current &&
        !ownerInputRef.current.contains(e.target as Node)
      ) {
        setShowOwnerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Submit ──
  const onSubmit = (data: PetForm) => {
    if (!selectedOwnerId) {
      toast.error("Seleccioná un familiar para el paciente");
      ownerInputRef.current?.focus();
      return;
    }
    createPetMut.mutate({ ...data, ownerId: selectedOwnerId });
  };

  const handleCreateOwner = () => {
    if (!newOwner.name.trim()) {
      toast.error("El nombre del familiar es requerido");
      return;
    }
    createOwnerMut.mutate({
      name: newOwner.name,
      phone: newOwner.phone || undefined,
      email: newOwner.email || undefined,
      address: newOwner.address || undefined,
      notes: newOwner.notes || undefined,
    });
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/pacientes")}
          className="gap-2 -ml-2 mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Pacientes
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold font-display flex items-center gap-3">
          <PawPrint className="h-7 w-7 text-primary" />
          Nuevo paciente
        </h1>
        <p className="text-muted-foreground mt-1">
          Completá los datos del paciente y su familiar responsable.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ═══════════════════════════════════════════════════════
            SECTION 1: FAMILIAR
           ═══════════════════════════════════════════════════════ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Familiar responsable
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Searchable owner combobox */}
            <div className="relative">
              <Label className="mb-1.5 block">
                Buscar familiar existente o crear uno nuevo
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={ownerInputRef}
                  placeholder="Escribí el nombre, teléfono o email del familiar..."
                  value={ownerSearch}
                  onChange={(e) => {
                    setOwnerSearch(e.target.value);
                    setShowOwnerDropdown(true);
                    if (selectedOwnerId) {
                      setSelectedOwnerId(null);
                    }
                  }}
                  onFocus={() => setShowOwnerDropdown(true)}
                  className="pl-10 h-12 text-base"
                />
                {selectedOwnerId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOwnerId(null);
                      setOwnerSearch("");
                      ownerInputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Dropdown results */}
              {showOwnerDropdown && !selectedOwnerId && (
                <div
                  ref={dropdownRef}
                  className="absolute z-50 top-full mt-1 w-full bg-popover text-popover-foreground border rounded-lg shadow-lg max-h-72 overflow-y-auto"
                >
                  {filteredOwners.length > 0 ? (
                    <>
                      {filteredOwners.map((owner) => (
                        <button
                          key={owner.id}
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-center gap-3 border-b last:border-b-0"
                          onClick={() => {
                            setSelectedOwnerId(owner.id);
                            setOwnerSearch(owner.name);
                            setShowOwnerDropdown(false);
                            setShowNewOwnerForm(false);
                          }}
                        >
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {owner.name}
                            </p>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              {owner.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" /> {owner.phone}
                                </span>
                              )}
                              {owner.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" /> {owner.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No se encontraron familiares
                    </div>
                  )}
                  {/* Create new button - visible when dropdown is open */}
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-center gap-3 border-t bg-muted/30"
                    onClick={() => {
                      setShowNewOwnerForm(true);
                      setShowOwnerDropdown(false);
                      setNewOwner((prev) => ({
                        ...prev,
                        name: ownerSearch,
                      }));
                    }}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Plus className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-primary">
                        Crear nuevo familiar
                      </p>
                      {ownerSearch && (
                        <p className="text-xs text-muted-foreground">
                          "{ownerSearch}"
                        </p>
                      )}
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Selected owner info card */}
            {selectedOwner && (
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{selectedOwner.name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-0.5">
                      {selectedOwner.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />{" "}
                          {selectedOwner.phone}
                        </span>
                      )}
                      {selectedOwner.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />{" "}
                          {selectedOwner.email}
                        </span>
                      )}
                      {selectedOwner.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />{" "}
                          {selectedOwner.address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* New owner inline form */}
            {showNewOwnerForm && !selectedOwnerId && (
              <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" />
                    Nuevo familiar
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewOwnerForm(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Nombre *</Label>
                    <Input
                      value={newOwner.name}
                      onChange={(e) =>
                        setNewOwner((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="Nombre completo"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Teléfono</Label>
                    <Input
                      value={newOwner.phone}
                      onChange={(e) =>
                        setNewOwner((p) => ({ ...p, phone: e.target.value }))
                      }
                      placeholder="Ej: +54 11 1234-5678"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newOwner.email}
                      onChange={(e) =>
                        setNewOwner((p) => ({ ...p, email: e.target.value }))
                      }
                      placeholder="email@ejemplo.com"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Dirección</Label>
                    <Input
                      value={newOwner.address}
                      onChange={(e) =>
                        setNewOwner((p) => ({ ...p, address: e.target.value }))
                      }
                      placeholder="Dirección del domicilio"
                      className="h-11"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleCreateOwner}
                    disabled={createOwnerMut.isPending}
                    size="sm"
                  >
                    {createOwnerMut.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1.5" />
                        Crear familiar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════════════════
            SECTION 2: PET INFO
           ═══════════════════════════════════════════════════════ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PawPrint className="h-5 w-5 text-primary" />
              Datos del paciente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nombre del paciente *</Label>
                <Input
                  {...register("name")}
                  placeholder="Ej: Firulais, Luna, Michi..."
                  className="h-12 text-base"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Especie *</Label>
                <Controller
                  name="species"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Seleccionar especie" />
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
                  <p className="text-xs text-destructive">
                    {errors.species.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Raza</Label>
                <Input
                  {...register("breed")}
                  placeholder="Ej: Labrador, Siamés..."
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sexo</Label>
                <Controller
                  name="sex"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fecha de nacimiento</Label>
                <Input
                  type="date"
                  {...register("birthDate")}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Peso (kg)</Label>
                <Input
                  {...register("weight")}
                  placeholder="Ej: 5.2"
                  type="number"
                  step="0.1"
                  className="h-11"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Color</Label>
                <Input
                  {...register("color")}
                  placeholder="Ej: Negro y blanco"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Microchip</Label>
                <Input
                  {...register("microchip")}
                  placeholder="Número de chip"
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea
                {...register("notes")}
                placeholder="Alergias, observaciones, comportamiento..."
                rows={3}
                className="text-base"
              />
            </div>
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════════════════
            SUBMIT
           ═══════════════════════════════════════════════════════ */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/pacientes")}
            className="h-12 sm:h-11 text-base sm:text-sm"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={createPetMut.isPending || !selectedOwnerId}
            className="h-12 sm:h-11 text-base sm:text-sm gap-2"
          >
            {createPetMut.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar paciente
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
