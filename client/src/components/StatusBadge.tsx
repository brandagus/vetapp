import { cn } from "@/lib/utils";

type AppointmentStatus = "pendiente" | "confirmado" | "completado" | "cancelado";
type PaymentStatus = "pagado" | "pendiente" | "parcial";

const appointmentColors: Record<AppointmentStatus, string> = {
  pendiente: "bg-amber-100 text-amber-800 border-amber-200",
  confirmado: "bg-blue-100 text-blue-800 border-blue-200",
  completado: "bg-green-100 text-green-800 border-green-200",
  cancelado: "bg-red-100 text-red-800 border-red-200",
};

const paymentColors: Record<PaymentStatus, string> = {
  pagado: "bg-green-100 text-green-800 border-green-200",
  pendiente: "bg-amber-100 text-amber-800 border-amber-200",
  parcial: "bg-orange-100 text-orange-800 border-orange-200",
};

const appointmentLabels: Record<AppointmentStatus, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  completado: "Completado",
  cancelado: "Cancelado",
};

const paymentLabels: Record<PaymentStatus, string> = {
  pagado: "Pagado",
  pendiente: "Pendiente",
  parcial: "Parcial",
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        appointmentColors[status]
      )}
    >
      {appointmentLabels[status]}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        paymentColors[status]
      )}
    >
      {paymentLabels[status]}
    </span>
  );
}
