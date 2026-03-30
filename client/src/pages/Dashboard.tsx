import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentStatusBadge, PaymentStatusBadge } from "@/components/StatusBadge";
import {
  Calendar,
  DollarSign,
  Users,
  PawPrint,
  Clock,
  MapPin,
  Phone,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  color = "primary",
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  color?: "primary" | "amber" | "green" | "blue";
}) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1 font-display">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${colorMap[color]} shrink-0 ml-3`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.dashboard.getSummary.useQuery();

  const today = format(new Date(), "EEEE d 'de' MMMM", { locale: es });
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-1" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const stats = data?.stats;
  const todayAppts = data?.todayAppointments ?? [];
  const pendingPayments = data?.pendingPayments ?? [];
  const recentVisits = data?.recentVisits ?? [];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display">Inicio</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{todayCapitalized}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          title="Turnos hoy"
          value={todayAppts.length}
          icon={Calendar}
          color="primary"
        />
        <StatCard
          title="Cobros pendientes"
          value={stats?.pendingCount ?? 0}
          icon={AlertCircle}
          color="amber"
        />
        <StatCard
          title="Familiares"
          value={stats?.totalOwners ?? 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Pacientes"
          value={stats?.totalPets ?? 0}
          icon={PawPrint}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Today's appointments */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Turnos de hoy
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => setLocation("/turnos")}
              >
                Ver todos
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {todayAppts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No hay turnos para hoy</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayAppts.map(appt => (
                  <div
                    key={appt.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => setLocation("/turnos")}
                  >
                    <div className="flex flex-col items-center shrink-0 w-12">
                      <span className="text-sm font-semibold text-primary">
                        {format(new Date(appt.startTime), "HH:mm")}
                      </span>
                      <Clock className="h-3 w-3 text-muted-foreground mt-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {appt.ownerName ?? appt.clientName ?? "Sin nombre"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {appt.linkedPetName ?? appt.petName ?? "Mascota"}{" "}
                        {appt.petSpecies ? `(${appt.petSpecies})` : ""}
                      </p>
                      {appt.address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {appt.address}
                        </p>
                      )}
                    </div>
                    <AppointmentStatusBadge status={appt.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending payments */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-amber-600" />
                Cobros pendientes
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => setLocation("/finanzas")}
              >
                Ver todos
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {pendingPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No hay cobros pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPayments.map(payment => (
                  <div
                    key={payment.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100 cursor-pointer hover:bg-amber-100/60 transition-colors"
                    onClick={() => setLocation("/finanzas")}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {payment.ownerName ?? "Propietario"}
                      </p>
                      {payment.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {payment.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(payment.createdAt), "d MMM yyyy", { locale: es })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm text-amber-700">
                        ${Number(payment.amount).toLocaleString("es-AR")}
                      </p>
                      <PaymentStatusBadge status="pendiente" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent visits */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PawPrint className="h-4 w-4 text-primary" />
              Visitas recientes
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setLocation("/pacientes")}
            >
              Ver todas
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {recentVisits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <PawPrint className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay visitas registradas</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentVisits.map(visit => (
                <div
                  key={visit.id}
                  className="flex items-center gap-3 py-3 cursor-pointer hover:bg-muted/40 px-2 rounded-lg transition-colors -mx-2"
                  onClick={() => setLocation(`/historial/visita/${visit.id}`)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <PawPrint className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {visit.petName ?? "Mascota"}{" "}
                      <span className="text-muted-foreground font-normal">
                        — {visit.ownerName ?? "Propietario"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{visit.reason}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(visit.visitDate), "d MMM", { locale: es })}
                    </p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto mt-1" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
