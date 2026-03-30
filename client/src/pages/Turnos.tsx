import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Phone,
  Check,
  X,
  CheckCheck,
  Link2,
  Unlink,
  RefreshCw,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isToday,
} from "date-fns";
import { es } from "date-fns/locale";
import { AppointmentStatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { useSearch } from "wouter";

const appointmentSchema = z.object({
  ownerId: z.number().optional(),
  petId: z.number().optional(),
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
  petName: z.string().optional(),
  petSpecies: z.string().optional(),
  startTime: z.string().min(1, "La fecha y hora son requeridas"),
  endTime: z.string().optional(),
  reason: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(["pendiente", "confirmado", "completado", "cancelado"]),
  notes: z.string().optional(),
});
type AppointmentForm = z.infer<typeof appointmentSchema>;

type ViewMode = "month" | "week" | "list";

export default function Turnos() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const searchString = useSearch();

  // Check for Google Calendar connection callback
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    if (params.get("gcal") === "connected") {
      toast.success("Google Calendar conectado exitosamente");
      window.history.replaceState({}, "", "/turnos");
    } else if (params.get("gcal") === "error") {
      toast.error("Error al conectar Google Calendar");
      window.history.replaceState({}, "", "/turnos");
    }
  }, [searchString]);

  // Google Calendar status
  const { data: gcalStatus } = trpc.googleCalendar.status.useQuery();
  const connectGcal = trpc.googleCalendar.getAuthUrl.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: () => toast.error("Error al conectar con Google"),
  });
  const disconnectGcal = trpc.googleCalendar.disconnect.useMutation({
    onSuccess: () => {
      utils.googleCalendar.status.invalidate();
      toast.success("Google Calendar desconectado");
    },
  });
  const syncAppt = trpc.googleCalendar.syncAppointment.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        utils.appointments.list.invalidate();
        toast.success("Turno sincronizado con Google Calendar");
      } else {
        toast.error("No se pudo sincronizar el turno");
      }
      setSyncingId(null);
    },
    onError: () => {
      toast.error("Error al sincronizar");
      setSyncingId(null);
    },
  });
  const updateGcalAppt = trpc.googleCalendar.updateAppointment.useMutation({
    onSuccess: () => toast.success("Evento actualizado en Google Calendar"),
    onError: () => toast.error("Error al actualizar en Google Calendar"),
  });

  // Compute date range for query
  const dateRange = useMemo(() => {
    if (viewMode === "month") {
      return {
        from: startOfMonth(currentDate).toISOString(),
        to: endOfMonth(currentDate).toISOString(),
      };
    } else if (viewMode === "week") {
      return {
        from: startOfWeek(currentDate, { weekStartsOn: 1 }).toISOString(),
        to: endOfWeek(currentDate, { weekStartsOn: 1 }).toISOString(),
      };
    }
    return {};
  }, [currentDate, viewMode]);

  const { data: appointments, isLoading } = trpc.appointments.list.useQuery(dateRange);
  const { data: owners } = trpc.owners.list.useQuery(undefined);
  const { data: pets } = trpc.pets.list.useQuery(undefined);

  const createMutation = trpc.appointments.create.useMutation({
    onSuccess: (data) => {
      utils.appointments.list.invalidate();
      utils.dashboard.getSummary.invalidate();
      setShowCreate(false);
      reset();
      toast.success("Turno creado");
      // Auto-sync to Google Calendar if connected
      if (gcalStatus?.connected && data.id) {
        syncAppt.mutate({
          appointmentId: data.id,
          origin: window.location.origin,
        });
      }
    },
    onError: () => toast.error("Error al crear el turno"),
  });

  const updateStatusMutation = trpc.appointments.updateStatus.useMutation({
    onSuccess: (_data, variables) => {
      utils.appointments.list.invalidate();
      utils.dashboard.getSummary.invalidate();
      toast.success("Estado actualizado");
      // Auto-update in Google Calendar if connected
      if (gcalStatus?.connected) {
        updateGcalAppt.mutate({
          appointmentId: variables.id,
          origin: window.location.origin,
        });
      }
    },
    onError: () => toast.error("Error al actualizar el estado"),
  });

  const deleteMutation = trpc.appointments.delete.useMutation({
    onSuccess: () => {
      utils.appointments.list.invalidate();
      setSelectedAppt(null);
      toast.success("Turno eliminado");
    },
  });

  const { register, handleSubmit, reset, control, setValue } = useForm<AppointmentForm>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: { status: "pendiente" },
  });

  const onSubmit = (data: AppointmentForm) => {
    const startTime = new Date(data.startTime);
    const endTime = data.endTime
      ? new Date(data.endTime)
      : new Date(startTime.getTime() + 60 * 60 * 1000);
    createMutation.mutate({
      ...data,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    });
  };

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    const dateStr = format(day, "yyyy-MM-dd'T'09:00");
    setValue("startTime", dateStr);
    setShowCreate(true);
  };

  const getApptsForDay = (day: Date) =>
    appointments?.filter(a => isSameDay(new Date(a.startTime), day)) ?? [];

  const selectedApptData = appointments?.find(a => a.id === selectedAppt);

  // Navigation
  const prev = () => {
    if (viewMode === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(subWeeks(currentDate, 1));
  };
  const next = () => {
    if (viewMode === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(addWeeks(currentDate, 1));
  };

  const title = viewMode === "month"
    ? format(currentDate, "MMMM yyyy", { locale: es })
    : viewMode === "week"
    ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM", { locale: es })} – ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM yyyy", { locale: es })}`
    : "Todos los turnos";

  const titleCapitalized = title.charAt(0).toUpperCase() + title.slice(1);

  const handleSyncToGcal = (appointmentId: number) => {
    setSyncingId(appointmentId);
    syncAppt.mutate({
      appointmentId,
      origin: window.location.origin,
    });
  };

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Turnos
          </h1>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {/* Google Calendar connection badge */}
          {gcalStatus?.connected ? (
            <Badge
              variant="outline"
              className="text-green-700 border-green-300 bg-green-50 gap-1 cursor-pointer hover:bg-green-100 transition-colors"
              onClick={() => {
                if (confirm("¿Desconectar Google Calendar?")) {
                  disconnectGcal.mutate();
                }
              }}
            >
              <Link2 className="h-3 w-3" />
              Google Calendar
            </Badge>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() =>
                connectGcal.mutate({ origin: window.location.origin })
              }
              disabled={connectGcal.isPending}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                <path d="M18.316 5.684H24v12.632h-5.684V5.684z" fill="#1A73E8"/>
                <path d="M5.684 18.316V24H0v-5.684h5.684z" fill="#EA4335"/>
                <path d="M5.684 5.684H0V0h5.684v5.684z" fill="#4285F4"/>
                <path d="M18.316 5.684V0H24v5.684h-5.684z" fill="#188038"/>
                <path d="M18.316 18.316H24V24h-5.684v-5.684z" fill="#FBBC04"/>
                <path d="M5.684 18.316H0V24h5.684v-5.684z" fill="#EA4335"/>
                <path d="M5.684 5.684h12.632v12.632H5.684V5.684z" fill="#fff"/>
                <path d="M8.4 15.2l1.2-1.2 1.8 1.8 3.8-3.8 1.2 1.2-5 5-3-3z" fill="#1A73E8"/>
              </svg>
              Conectar Google Calendar
            </Button>
          )}

          <div className="flex rounded-lg border overflow-hidden">
            <button
              className={cn("px-3 py-1.5 text-xs font-medium transition-colors", viewMode === "month" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
              onClick={() => setViewMode("month")}
            >
              Mes
            </button>
            <button
              className={cn("px-3 py-1.5 text-xs font-medium transition-colors border-l", viewMode === "week" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
              onClick={() => setViewMode("week")}
            >
              Semana
            </button>
            <button
              className={cn("px-3 py-1.5 text-xs font-medium transition-colors border-l", viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
              onClick={() => setViewMode("list")}
            >
              Lista
            </button>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nuevo turno
          </Button>
        </div>
      </div>

      {/* Calendar navigation */}
      {viewMode !== "list" && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={prev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold text-base">{titleCapitalized}</h2>
          <Button variant="outline" size="sm" onClick={next}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Monthly calendar */}
      {viewMode === "month" && (
        <Card>
          <CardContent className="p-3">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {d}
                </div>
              ))}
            </div>
            {/* Days grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {eachDayOfInterval({
                start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
                end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
              }).map(day => {
                const dayAppts = getApptsForDay(day);
                const inMonth = isSameMonth(day, currentDate);
                const today = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-[72px] p-1 rounded-lg cursor-pointer transition-colors",
                      inMonth ? "hover:bg-muted/60" : "opacity-40",
                      today && "bg-primary/5 ring-1 ring-primary/30"
                    )}
                    onClick={() => handleDayClick(day)}
                  >
                    <p className={cn(
                      "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1",
                      today ? "bg-primary text-primary-foreground" : "text-foreground"
                    )}>
                      {format(day, "d")}
                    </p>
                    <div className="space-y-0.5">
                      {dayAppts.slice(0, 3).map(appt => (
                        <div
                          key={appt.id}
                          className={cn(
                            "text-xs px-1 py-0.5 rounded truncate cursor-pointer",
                            appt.status === "pendiente" && "bg-amber-100 text-amber-800",
                            appt.status === "confirmado" && "bg-blue-100 text-blue-800",
                            appt.status === "completado" && "bg-green-100 text-green-800",
                            appt.status === "cancelado" && "bg-red-100 text-red-800 line-through"
                          )}
                          onClick={e => { e.stopPropagation(); setSelectedAppt(appt.id); }}
                        >
                          {format(new Date(appt.startTime), "HH:mm")} {appt.ownerName ?? appt.clientName ?? "Turno"}
                        </div>
                      ))}
                      {dayAppts.length > 3 && (
                        <p className="text-xs text-muted-foreground pl-1">+{dayAppts.length - 3} más</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly view */}
      {viewMode === "week" && (
        <div className="space-y-2">
          {eachDayOfInterval({
            start: startOfWeek(currentDate, { weekStartsOn: 1 }),
            end: endOfWeek(currentDate, { weekStartsOn: 1 }),
          }).map(day => {
            const dayAppts = getApptsForDay(day);
            return (
              <Card key={day.toISOString()} className={cn(isToday(day) && "ring-1 ring-primary/30")}>
                <CardHeader className="py-2 px-4">
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      "font-semibold text-sm",
                      isToday(day) && "text-primary"
                    )}>
                      {format(day, "EEEE d", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => handleDayClick(day)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Agregar
                    </Button>
                  </div>
                </CardHeader>
                {dayAppts.length > 0 && (
                  <CardContent className="pt-0 pb-3 px-4">
                    <div className="space-y-2">
                      {dayAppts.map(appt => (
                        <div
                          key={appt.id}
                          className="flex items-center gap-3 p-2 rounded-lg bg-muted/40 hover:bg-muted cursor-pointer transition-colors"
                          onClick={() => setSelectedAppt(appt.id)}
                        >
                          <span className="text-xs font-semibold text-primary w-12 shrink-0">
                            {format(new Date(appt.startTime), "HH:mm")}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {appt.ownerName ?? appt.clientName ?? "Sin nombre"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {appt.linkedPetName ?? appt.petName ?? "Mascota"}{appt.petSpecies ? ` (${appt.petSpecies})` : ""}
                            </p>
                          </div>
                          <AppointmentStatusBadge status={appt.status} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* List view */}
      {viewMode === "list" && (
        <div className="space-y-2">
          {isLoading ? (
            [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : !appointments || appointments.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No hay turnos registrados</p>
            </div>
          ) : (
            appointments.map(appt => (
              <Card
                key={appt.id}
                className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
                onClick={() => setSelectedAppt(appt.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center shrink-0 w-14">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(appt.startTime), "d MMM", { locale: es })}
                      </span>
                      <span className="text-sm font-bold text-primary">
                        {format(new Date(appt.startTime), "HH:mm")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">
                        {appt.ownerName ?? appt.clientName ?? "Sin nombre"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {appt.linkedPetName ?? appt.petName ?? "Mascota"}{appt.petSpecies ? ` · ${appt.petSpecies}` : ""}
                      </p>
                      {appt.address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {appt.address}
                        </p>
                      )}
                    </div>
                    <AppointmentStatusBadge status={appt.status} />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Appointment detail dialog */}
      {selectedApptData && (
        <Dialog open={!!selectedAppt} onOpenChange={() => setSelectedAppt(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Detalle del turno</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">
                    {selectedApptData.ownerName ?? selectedApptData.clientName ?? "Sin nombre"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedApptData.linkedPetName ?? selectedApptData.petName ?? "Mascota"}
                    {selectedApptData.petSpecies ? ` (${selectedApptData.petSpecies})` : ""}
                  </p>
                </div>
                <AppointmentStatusBadge status={selectedApptData.status} />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {format(new Date(selectedApptData.startTime), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
              </div>
              {selectedApptData.address && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  {selectedApptData.address}
                </div>
              )}
              {(selectedApptData.ownerPhone ?? selectedApptData.clientPhone) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {selectedApptData.ownerPhone ?? selectedApptData.clientPhone}
                </div>
              )}
              {selectedApptData.reason && (
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <span className="font-medium">Motivo: </span>{selectedApptData.reason}
                </div>
              )}
              {selectedApptData.notes && (
                <p className="text-sm text-muted-foreground italic">{selectedApptData.notes}</p>
              )}

              {/* Google Calendar sync button */}
              {gcalStatus?.connected && (
                <div className="pt-2 border-t">
                  {selectedApptData.googleCalendarEventId ? (
                    <div className="flex items-center gap-2 text-xs text-green-700">
                      <Link2 className="h-3.5 w-3.5" />
                      <span>Sincronizado con Google Calendar</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs ml-auto"
                        onClick={() => updateGcalAppt.mutate({
                          appointmentId: selectedApptData.id,
                          origin: window.location.origin,
                        })}
                        disabled={updateGcalAppt.isPending}
                      >
                        <RefreshCw className={cn("h-3 w-3 mr-1", updateGcalAppt.isPending && "animate-spin")} />
                        Actualizar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs gap-1.5"
                      onClick={() => handleSyncToGcal(selectedApptData.id)}
                      disabled={syncingId === selectedApptData.id}
                    >
                      {syncingId === selectedApptData.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Link2 className="h-3.5 w-3.5" />
                      )}
                      Sincronizar con Google Calendar
                    </Button>
                  )}
                </div>
              )}

              {/* Status actions */}
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">Cambiar estado:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedApptData.status !== "confirmado" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-700 border-blue-200 hover:bg-blue-50"
                      onClick={() => updateStatusMutation.mutate({ id: selectedApptData.id, status: "confirmado" })}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Confirmar
                    </Button>
                  )}
                  {selectedApptData.status !== "completado" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-700 border-green-200 hover:bg-green-50"
                      onClick={() => updateStatusMutation.mutate({ id: selectedApptData.id, status: "completado" })}
                    >
                      <CheckCheck className="h-3.5 w-3.5 mr-1" />
                      Completar
                    </Button>
                  )}
                  {selectedApptData.status !== "cancelado" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-700 border-red-200 hover:bg-red-50"
                      onClick={() => updateStatusMutation.mutate({ id: selectedApptData.id, status: "cancelado" })}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Cancelar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive ml-auto"
                    onClick={() => deleteMutation.mutate({ id: selectedApptData.id })}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo turno</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Familiar existente</Label>
                <Controller
                  name="ownerId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value?.toString()}
                      onValueChange={v => field.onChange(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {owners?.map(o => (
                          <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label>O nombre del cliente</Label>
                <Input {...register("clientName")} placeholder="Nombre del cliente" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input {...register("clientPhone")} placeholder="+54 11..." />
              </div>
              <div className="space-y-1.5">
                <Label>Nombre de mascota</Label>
                <Input {...register("petName")} placeholder="Ej: Firulais" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Especie</Label>
                <Input {...register("petSpecies")} placeholder="Perro, Gato..." />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="confirmado">Confirmado</SelectItem>
                        <SelectItem value="completado">Completado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha y hora inicio *</Label>
                <Input type="datetime-local" {...register("startTime")} />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha y hora fin</Label>
                <Input type="datetime-local" {...register("endTime")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Dirección del domicilio</Label>
              <Input {...register("address")} placeholder="Calle, número, ciudad" />
            </div>

            <div className="space-y-1.5">
              <Label>Motivo</Label>
              <Input {...register("reason")} placeholder="Ej: Control anual, vacunación..." />
            </div>

            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea {...register("notes")} rows={2} placeholder="Observaciones..." />
            </div>

            {gcalStatus?.connected && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 text-green-700 text-xs">
                <Link2 className="h-3.5 w-3.5" />
                Se sincronizará automáticamente con Google Calendar
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Guardando..." : "Guardar turno"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
