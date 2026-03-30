import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Stethoscope,
  DollarSign,
  Camera,
  Edit,
  Plus,
  FileText,
  ChevronRight,
  Weight,
  Thermometer,
  Trash2,
} from "lucide-react";
import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function toDate(d: unknown): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  if (typeof d === "string" || typeof d === "number") return new Date(d);
  return null;
}

function formatDate(d: unknown) {
  const date = toDate(d);
  if (!date) return "—";
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(d: unknown) {
  const date = toDate(d);
  if (!date) return "—";
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calcAge(birthDate: unknown): string {
  if (!birthDate) return "Edad desconocida";
  const birth = birthDate instanceof Date ? birthDate : new Date(String(birthDate));
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  if (years > 0) return `${years} año${years > 1 ? "s" : ""}`;
  if (months > 0) return `${months} mes${months > 1 ? "es" : ""}`;
  return "< 1 mes";
}

function speciesEmoji(species: string): string {
  const s = species.toLowerCase();
  if (s.includes("perro") || s.includes("can")) return "🐕";
  if (s.includes("gato") || s.includes("felin")) return "🐈";
  if (s.includes("ave") || s.includes("pájaro") || s.includes("pajaro")) return "🐦";
  if (s.includes("conejo")) return "🐇";
  if (s.includes("hamster") || s.includes("hámster")) return "🐹";
  if (s.includes("tortuga")) return "🐢";
  if (s.includes("pez")) return "🐟";
  return "🐾";
}

export default function MascotaDetalle() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const petId = Number(params.id);
  const utils = trpc.useUtils();

  const { data: pet, isLoading, refetch } = trpc.pets.getProfile.useQuery({ id: petId });
  const { data: visitsList } = trpc.visits.listByPet.useQuery({ petId });
  const uploadPhotoMut = trpc.pets.uploadPhoto.useMutation({
    onSuccess: () => {
      utils.pets.getProfile.invalidate({ id: petId });
      toast.success("Foto actualizada");
    },
    onError: () => toast.error("Error al subir la foto"),
  });
  const updatePetMut = trpc.pets.update.useMutation({
    onSuccess: () => {
      utils.pets.getProfile.invalidate({ id: petId });
      setShowEditDialog(false);
      toast.success("Datos actualizados");
    },
    onError: () => toast.error("Error al guardar"),
  });
  const deleteMut = trpc.pets.delete.useMutation({
    onSuccess: () => {
      utils.pets.list.invalidate();
      setLocation("/pacientes");
      toast.success("Paciente eliminado");
    },
  });

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-48 bg-muted rounded-xl" />
        <div className="h-32 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="max-w-4xl">
        <Button variant="ghost" onClick={() => setLocation("/pacientes")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
        <p className="text-muted-foreground mt-8 text-center">Paciente no encontrado.</p>
      </div>
    );
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      try {
        await uploadPhotoMut.mutateAsync({
          petId,
          fileName: file.name,
          mimeType: file.type,
          fileBase64: base64,
        });
      } catch {
        // handled by onError
      }
    };
    reader.readAsDataURL(file);
  };

  const openEdit = () => {
    setEditForm({
      name: pet.name,
      species: pet.species,
      breed: pet.breed ?? "",
      birthDate: pet.birthDate ? String(pet.birthDate) : "",
      sex: pet.sex ?? "desconocido",
      color: pet.color ?? "",
      weight: pet.weight ?? "",
      microchip: pet.microchip ?? "",
      notes: pet.notes ?? "",
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    await updatePetMut.mutateAsync({
      id: petId,
      name: editForm.name,
      species: editForm.species,
      breed: editForm.breed || undefined,
      birthDate: editForm.birthDate || undefined,
      sex: (editForm.sex as "macho" | "hembra" | "desconocido") || undefined,
      color: editForm.color || undefined,
      weight: editForm.weight || undefined,
      microchip: editForm.microchip || undefined,
      notes: editForm.notes || undefined,
    });
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => setLocation("/pacientes")} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Pacientes
      </Button>

      {/* ── PATIENT HEADER CARD ── */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 md:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            {/* Photo */}
            <div className="relative shrink-0 self-center sm:self-start">
              <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-background shadow-lg">
                <AvatarImage src={pet.photoUrl ?? undefined} alt={pet.name} className="object-cover" />
                <AvatarFallback className="text-3xl bg-primary/10">
                  {speciesEmoji(pet.species)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h1 className="text-2xl md:text-3xl font-bold font-display truncate">{pet.name}</h1>
                <div className="flex gap-2 justify-center sm:justify-start flex-wrap">
                  <Badge variant="secondary" className="capitalize">
                    {speciesEmoji(pet.species)} {pet.species}
                  </Badge>
                  {pet.sex && pet.sex !== "desconocido" && (
                    <Badge variant="outline" className="capitalize">
                      {pet.sex === "macho" ? "♂ Macho" : "♀ Hembra"}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground justify-center sm:justify-start">
                {pet.breed && <span>{pet.breed}</span>}
                {pet.birthDate && <span>{calcAge(pet.birthDate)}</span>}
                {pet.color && <span>{pet.color}</span>}
                {pet.weight && <span>{pet.weight} kg</span>}
                {pet.microchip && <span>Chip: {pet.microchip}</span>}
              </div>

              {/* Quick stats */}
              <div className="flex flex-wrap gap-3 mt-3 justify-center sm:justify-start">
                <div className="flex items-center gap-1.5 text-xs bg-background/80 rounded-full px-3 py-1.5 shadow-sm">
                  <Stethoscope className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium">{pet.visitCount ?? 0} visitas</span>
                </div>
                {pet.lastVisit && (
                  <div className="flex items-center gap-1.5 text-xs bg-background/80 rounded-full px-3 py-1.5 shadow-sm">
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                    <span>Última: {formatDate(pet.lastVisit.visitDate)}</span>
                  </div>
                )}
                {pet.lastPayment && (
                  <div className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 shadow-sm ${
                    pet.lastPayment.status === "pagado" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>${pet.lastPayment.amount} — {pet.lastPayment.status}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2 justify-center sm:justify-start flex-wrap">
                <Button size="sm" variant="outline" onClick={openEdit} className="gap-1.5">
                  <Edit className="h-3.5 w-3.5" /> Editar
                </Button>
                <Button
                  size="sm"
                  onClick={() => setLocation(`/pacientes/${petId}/nueva-visita`)}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Nueva visita
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/30 gap-1.5">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar paciente?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Se eliminará {pet.name} y todos sus datos. Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground"
                        onClick={() => deleteMut.mutate({ id: petId })}
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── OWNER INFO CARD ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Familiar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Nombre</p>
                <button
                  className="font-medium truncate text-primary hover:underline text-sm"
                  onClick={() => {}}
                >
                  {pet.ownerName ?? "—"}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <Phone className="h-4 w-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Teléfono</p>
                <p className="font-medium truncate text-sm">
                  {pet.ownerPhone ? (
                    <a href={`tel:${pet.ownerPhone}`} className="text-blue-600 hover:underline">
                      {pet.ownerPhone}
                    </a>
                  ) : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium truncate text-sm">
                  {pet.ownerEmail ? (
                    <a href={`mailto:${pet.ownerEmail}`} className="text-purple-600 hover:underline">
                      {pet.ownerEmail}
                    </a>
                  ) : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Dirección</p>
                <p className="font-medium truncate text-sm">{pet.ownerAddress ?? "—"}</p>
              </div>
            </div>
          </div>
          {pet.ownerNotes && (
            <>
              <Separator className="my-3" />
              <p className="text-sm text-muted-foreground italic">{pet.ownerNotes}</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── NOTES ── */}
      {pet.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Notas del paciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{pet.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* ── VISIT HISTORY ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold font-display flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" /> Historial de visitas
          </h2>
          <Button
            size="sm"
            onClick={() => setLocation(`/pacientes/${petId}/nueva-visita`)}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Nueva visita
          </Button>
        </div>

        {!visitsList || visitsList.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Stethoscope className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No hay visitas registradas aún.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setLocation(`/pacientes/${petId}/nueva-visita`)}
              >
                <Plus className="h-4 w-4 mr-1" /> Registrar primera visita
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {visitsList.map((visit) => (
              <Card
                key={visit.id}
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => setLocation(`/visita/${visit.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          {formatDateTime(visit.visitDate)}
                        </span>
                        {visit.diagnosis && (
                          <Badge variant="secondary" className="text-xs">
                            {visit.diagnosis.length > 30
                              ? visit.diagnosis.slice(0, 30) + "…"
                              : visit.diagnosis}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {visit.reason}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        {visit.weight && (
                          <span className="flex items-center gap-1">
                            <Weight className="h-3 w-3" /> {visit.weight} kg
                          </span>
                        )}
                        {visit.temperature && (
                          <span className="flex items-center gap-1">
                            <Thermometer className="h-3 w-3" /> {visit.temperature}°C
                          </span>
                        )}
                        {visit.medications && (
                          <span className="flex items-center gap-1">
                            💊 Medicación
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── EDIT DIALOG ── */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar paciente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={editForm.name ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Especie *</Label>
                <Input
                  value={editForm.species ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, species: e.target.value }))}
                />
              </div>
              <div>
                <Label>Raza</Label>
                <Input
                  value={editForm.breed ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, breed: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha de nacimiento</Label>
                <Input
                  type="date"
                  value={editForm.birthDate ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, birthDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>Sexo</Label>
                <Select
                  value={editForm.sex ?? "desconocido"}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, sex: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="macho">Macho</SelectItem>
                    <SelectItem value="hembra">Hembra</SelectItem>
                    <SelectItem value="desconocido">Desconocido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Color</Label>
                <Input
                  value={editForm.color ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))}
                />
              </div>
              <div>
                <Label>Peso (kg)</Label>
                <Input
                  value={editForm.weight ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, weight: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Microchip</Label>
              <Input
                value={editForm.microchip ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, microchip: e.target.value }))}
              />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                value={editForm.notes ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={updatePetMut.isPending}>
              {updatePetMut.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
