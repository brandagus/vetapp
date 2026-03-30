import { useState, useMemo, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  ChevronDown,
  Home,
  UtensilsCrossed,
  HeartPulse,
  Bug,
  Scissors,
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
  sex: z.string().optional(),
  color: z.string().optional(),
  weight: z.string().optional(),
  microchip: z.string().optional(),
  notes: z.string().optional(),
  patientType: z.string().optional(),
  environment: z.string().optional(),
  livesWithOtherAnimals: z.boolean().optional(),
  otherAnimalsDetails: z.string().optional(),
  dietType: z.string().optional(),
  dietBrand: z.string().optional(),
  dietNotes: z.string().optional(),
  knownAllergies: z.string().optional(),
  previousDiseases: z.string().optional(),
  previousSurgeries: z.string().optional(),
  currentMedication: z.string().optional(),
  isNeutered: z.string().optional(),
  behavior: z.string().optional(),
  lastDewormingDate: z.string().optional(),
  dewormingProduct: z.string().optional(),
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

// ── Collapsible section component ──
function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-accent/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2 font-semibold text-base">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </div>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <CardContent className="pt-0 pb-5 space-y-4">{children}</CardContent>}
    </Card>
  );
}

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
    watch,
    formState: { errors },
  } = useForm<PetForm>({
    resolver: zodResolver(petSchema),
    defaultValues: { sex: "desconocido", patientType: "visita_unica" },
  });

  const livesWithOtherAnimals = watch("livesWithOtherAnimals");

  // ── New owner form ──
  const [newOwner, setNewOwner] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
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
    createPetMut.mutate({
      ...data,
      ownerId: selectedOwnerId,
      sex: (data.sex as "macho" | "hembra" | "desconocido") || undefined,
      patientType: (data.patientType as "seguimiento" | "visita_unica") || undefined,
      environment: (data.environment as "interior" | "exterior" | "mixto") || undefined,
      dietType: (data.dietType as "balanceado" | "casera" | "mixta" | "barf" | "otra") || undefined,
      isNeutered: (data.isNeutered as "si" | "no" | "no_se") || undefined,
      behavior: (data.behavior as "tranquilo" | "nervioso" | "agresivo" | "miedoso" | "otro") || undefined,
    });
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
          Solo nombre y especie son obligatorios. El resto se puede completar después.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {/* ═══════════════════════════════════════════════════════
            SECTION 1: FAMILIAR
           ═══════════════════════════════════════════════════════ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Familiar responsable
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Searchable owner combobox */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={ownerInputRef}
                  placeholder="Buscar por nombre, teléfono o email..."
                  value={ownerSearch}
                  onChange={(e) => {
                    setOwnerSearch(e.target.value);
                    setShowOwnerDropdown(true);
                    if (selectedOwnerId) setSelectedOwnerId(null);
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
                    filteredOwners.map((owner) => (
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
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{owner.name}</p>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            {owner.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {owner.phone}
                              </span>
                            )}
                            {owner.email && (
                              <span className="flex items-center gap-1 truncate">
                                <Mail className="h-3 w-3" /> {owner.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      No se encontraron familiares
                    </div>
                  )}
                  {/* Create new owner button - only visible when dropdown is open */}
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-center gap-3 border-t bg-muted/30"
                    onClick={() => {
                      setShowNewOwnerForm(true);
                      setShowOwnerDropdown(false);
                    }}
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Plus className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-sm text-primary">
                      Crear nuevo familiar
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Selected owner info */}
            {selectedOwner && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{selectedOwner.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-0.5">
                    {selectedOwner.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {selectedOwner.phone}
                      </span>
                    )}
                    {selectedOwner.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {selectedOwner.email}
                      </span>
                    )}
                    {selectedOwner.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {selectedOwner.address}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* New owner inline form */}
            {showNewOwnerForm && !selectedOwnerId && (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <p className="font-semibold text-sm flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" /> Nuevo familiar
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre *</Label>
                    <Input
                      value={newOwner.name}
                      onChange={(e) => setNewOwner({ ...newOwner, name: e.target.value })}
                      placeholder="Nombre completo"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Teléfono</Label>
                    <Input
                      value={newOwner.phone}
                      onChange={(e) => setNewOwner({ ...newOwner, phone: e.target.value })}
                      placeholder="+54 11..."
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input
                      value={newOwner.email}
                      onChange={(e) => setNewOwner({ ...newOwner, email: e.target.value })}
                      placeholder="email@ejemplo.com"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Dirección</Label>
                    <Input
                      value={newOwner.address}
                      onChange={(e) => setNewOwner({ ...newOwner, address: e.target.value })}
                      placeholder="Calle, número, barrio..."
                      className="h-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewOwnerForm(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateOwner}
                    disabled={createOwnerMut.isPending}
                    className="gap-1"
                  >
                    {createOwnerMut.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Guardar familiar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════════════════
            SECTION 2: DATOS BÁSICOS DEL PACIENTE
           ═══════════════════════════════════════════════════════ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PawPrint className="h-5 w-5 text-primary" />
              Datos del paciente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input
                  {...register("name")}
                  placeholder="Nombre del paciente"
                  className="h-11"
                />
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
                      <SelectTrigger className="h-11">
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
                  <p className="text-xs text-destructive">{errors.species.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Raza</Label>
                <Input {...register("breed")} placeholder="Ej: Labrador, Siamés..." className="h-11" />
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Fecha de nacimiento</Label>
                <Input type="date" {...register("birthDate")} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label>Peso (kg)</Label>
                <Input {...register("weight")} placeholder="Ej: 5.2" type="number" step="0.1" className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label>Color / Pelaje</Label>
                <Input {...register("color")} placeholder="Ej: Negro y blanco" className="h-11" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Microchip</Label>
                <Input {...register("microchip")} placeholder="Número de chip" className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de paciente</Label>
                <Controller
                  name="patientType"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="visita_unica">Visita única</SelectItem>
                        <SelectItem value="seguimiento">Seguimiento</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Castrado/Esterilizado</Label>
                <Controller
                  name="isNeutered"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="si">Sí</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="no_se">No sé</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Comportamiento</Label>
                <Controller
                  name="behavior"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tranquilo">Tranquilo</SelectItem>
                        <SelectItem value="nervioso">Nervioso</SelectItem>
                        <SelectItem value="agresivo">Agresivo</SelectItem>
                        <SelectItem value="miedoso">Miedoso</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════════════════
            SECTION 3: AMBIENTE (collapsible)
           ═══════════════════════════════════════════════════════ */}
        <CollapsibleSection title="Ambiente y convivencia" icon={Home}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Ambiente</Label>
              <Controller
                name="environment"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interior">Interior</SelectItem>
                      <SelectItem value="exterior">Exterior</SelectItem>
                      <SelectItem value="mixto">Mixto</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Convive con otros animales</Label>
              <div className="flex items-center gap-3 h-11">
                <Controller
                  name="livesWithOtherAnimals"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <span className="text-sm text-muted-foreground">
                  {livesWithOtherAnimals ? "Sí" : "No"}
                </span>
              </div>
            </div>
          </div>
          {livesWithOtherAnimals && (
            <div className="space-y-1.5">
              <Label>Detalles de convivencia</Label>
              <Input
                {...register("otherAnimalsDetails")}
                placeholder="Ej: 2 gatos, 1 perro más..."
                className="h-11"
              />
            </div>
          )}
        </CollapsibleSection>

        {/* ═══════════════════════════════════════════════════════
            SECTION 4: ALIMENTACIÓN (collapsible)
           ═══════════════════════════════════════════════════════ */}
        <CollapsibleSection title="Alimentación" icon={UtensilsCrossed}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo de alimentación</Label>
              <Controller
                name="dietType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="balanceado">Balanceado</SelectItem>
                      <SelectItem value="casera">Casera</SelectItem>
                      <SelectItem value="mixta">Mixta</SelectItem>
                      <SelectItem value="barf">BARF</SelectItem>
                      <SelectItem value="otra">Otra</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Marca de alimento</Label>
              <Input
                {...register("dietBrand")}
                placeholder="Ej: Royal Canin, Eukanuba..."
                className="h-11"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notas sobre alimentación</Label>
            <Textarea
              {...register("dietNotes")}
              placeholder="Observaciones sobre la dieta..."
              rows={2}
            />
          </div>
        </CollapsibleSection>

        {/* ═══════════════════════════════════════════════════════
            SECTION 5: ANTECEDENTES MÉDICOS (collapsible)
           ═══════════════════════════════════════════════════════ */}
        <CollapsibleSection title="Antecedentes médicos" icon={HeartPulse}>
          <div className="space-y-1.5">
            <Label>Alergias conocidas</Label>
            <Textarea
              {...register("knownAllergies")}
              placeholder="Ej: Alergia a la proteína de pollo..."
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Enfermedades previas</Label>
            <Textarea
              {...register("previousDiseases")}
              placeholder="Ej: Parvovirus a los 3 meses..."
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cirugías previas</Label>
            <Textarea
              {...register("previousSurgeries")}
              placeholder="Ej: Castración, extracción de tumor..."
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Medicación actual</Label>
            <Textarea
              {...register("currentMedication")}
              placeholder="Ej: Enalapril 5mg cada 12hs..."
              rows={2}
            />
          </div>
        </CollapsibleSection>

        {/* ═══════════════════════════════════════════════════════
            SECTION 6: DESPARASITACIÓN (collapsible)
           ═══════════════════════════════════════════════════════ */}
        <CollapsibleSection title="Desparasitación" icon={Bug}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Última desparasitación</Label>
              <Input type="date" {...register("lastDewormingDate")} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Producto utilizado</Label>
              <Input
                {...register("dewormingProduct")}
                placeholder="Ej: Nexgard, Frontline..."
                className="h-11"
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* ═══════════════════════════════════════════════════════
            SECTION 7: NOTAS (collapsible)
           ═══════════════════════════════════════════════════════ */}
        <CollapsibleSection title="Notas generales" icon={Scissors}>
          <Textarea
            {...register("notes")}
            placeholder="Cualquier observación adicional sobre el paciente..."
            rows={4}
            className="text-base"
          />
        </CollapsibleSection>

        {/* ═══════════════════════════════════════════════════════
            SUBMIT
           ═══════════════════════════════════════════════════════ */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
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
