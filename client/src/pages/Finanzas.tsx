import { useState, useMemo } from "react";
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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Clock,
  CheckCircle,
  ChevronRight,
  Edit2,
  Trash2,
  Banknote,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PaymentStatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
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

const paymentSchema = z.object({
  ownerId: z.number().optional(),
  visitId: z.number().optional(),
  amount: z.string().min(1, "El monto es requerido"),
  method: z.enum(["efectivo", "transferencia", "otro"]),
  status: z.enum(["pagado", "pendiente", "parcial"]),
  description: z.string().optional(),
  paidAt: z.string().optional(),
});
type PaymentForm = z.infer<typeof paymentSchema>;

type StatusFilter = "todos" | "pagado" | "pendiente" | "parcial";

export default function Finanzas() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [searchText, setSearchText] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: payments, isLoading } = trpc.payments.list.useQuery(
    statusFilter !== "todos" ? { status: statusFilter } : undefined
  );
  const { data: owners } = trpc.owners.list.useQuery(undefined);

  const createMutation = trpc.payments.create.useMutation({
    onSuccess: () => {
      utils.payments.list.invalidate();
      utils.dashboard.getSummary.invalidate();
      setShowCreate(false);
      resetCreate();
      toast.success("Pago registrado");
    },
    onError: () => toast.error("Error al registrar el pago"),
  });

  const updateMutation = trpc.payments.update.useMutation({
    onSuccess: () => {
      utils.payments.list.invalidate();
      utils.dashboard.getSummary.invalidate();
      setEditingId(null);
      resetEdit();
      toast.success("Pago actualizado");
    },
    onError: () => toast.error("Error al actualizar"),
  });

  const deleteMutation = trpc.payments.delete.useMutation({
    onSuccess: () => {
      utils.payments.list.invalidate();
      utils.dashboard.getSummary.invalidate();
      toast.success("Pago eliminado");
    },
  });

  const {
    register: registerCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    control: controlCreate,
  } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      method: "efectivo",
      status: "pagado",
      paidAt: new Date().toISOString().slice(0, 10),
    },
  });

  const editingPayment = payments?.find(p => p.id === editingId);

  const {
    register: registerEdit,
    handleSubmit: handleEdit,
    reset: resetEdit,
    control: controlEdit,
  } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    values: editingPayment
      ? {
          ownerId: editingPayment.ownerId ?? undefined,
          amount: editingPayment.amount.toString(),
          method: editingPayment.method as "efectivo" | "transferencia" | "otro",
          status: editingPayment.status as "pagado" | "pendiente" | "parcial",
          description: editingPayment.description ?? "",
          paidAt: editingPayment.paidAt
            ? format(new Date(editingPayment.paidAt), "yyyy-MM-dd")
            : "",
        }
      : undefined,
  });

  const onCreateSubmit = (data: PaymentForm) => {
    createMutation.mutate({
      ownerId: data.ownerId ?? 0,
      visitId: data.visitId,
      amount: data.amount,
      method: data.method,
      status: data.status,
      description: data.description,
      paidAt: data.paidAt,
    });
  };

  const onEditSubmit = (data: PaymentForm) => {
    if (!editingId) return;
    updateMutation.mutate({
      id: editingId,
      amount: data.amount,
      method: data.method,
      status: data.status,
      description: data.description,
      paidAt: data.paidAt,
    });
  };

  // Stats
  const stats = useMemo(() => {
    if (!payments) return { total: 0, paid: 0, pending: 0, pendingCount: 0 };
    const paid = payments
      .filter(p => p.status === "pagado")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const pending = payments
      .filter(p => p.status === "pendiente" || p.status === "parcial")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    return {
      total: paid + pending,
      paid,
      pending,
      pendingCount: payments.filter(p => p.status === "pendiente" || p.status === "parcial").length,
    };
  }, [payments]);

  const filteredPayments = payments?.filter(p =>
    !searchText ||
    (p.ownerName ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
    (p.description ?? "").toLowerCase().includes(searchText.toLowerCase())
  );

  const PaymentForm = ({
    onSubmit,
    register,
    control,
    isPending,
    onCancel,
  }: {
    onSubmit: (e: React.FormEvent) => void;
    register: ReturnType<typeof useForm<PaymentForm>>["register"];
    control: ReturnType<typeof useForm<PaymentForm>>["control"];
    isPending: boolean;
    onCancel: () => void;
  }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Propietario</Label>
        <Controller
          name="ownerId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value?.toString()}
              onValueChange={v => field.onChange(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar propietario..." />
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Monto ($) *</Label>
          <Input type="number" step="0.01" {...register("amount")} placeholder="0.00" />
        </div>
        <div className="space-y-1.5">
          <Label>Fecha</Label>
          <Input type="date" {...register("paidAt")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Método de pago</Label>
          <Controller
            name="method"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
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
                  <SelectItem value="pagado">Pagado</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Descripción</Label>
        <Textarea {...register("description")} placeholder="Ej: Consulta + vacuna, control anual..." rows={2} />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Finanzas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registro de cobros y pagos pendientes
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" />
          Registrar cobro
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cobrado</p>
                <p className="font-bold text-lg font-display text-green-700">
                  ${stats.paid.toLocaleString("es-AR")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100">
                <AlertCircle className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pendiente</p>
                <p className="font-bold text-lg font-display text-amber-700">
                  ${stats.pending.toLocaleString("es-AR")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total registrado</p>
                <p className="font-bold text-lg font-display">
                  ${stats.total.toLocaleString("es-AR")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por propietario o descripción..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex rounded-lg border overflow-hidden shrink-0">
          {(["todos", "pagado", "pendiente", "parcial"] as StatusFilter[]).map(s => (
            <button
              key={s}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors capitalize",
                s !== "todos" && "border-l",
                statusFilter === s ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
              onClick={() => setStatusFilter(s)}
            >
              {s === "todos" ? "Todos" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Payment list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filteredPayments?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No hay cobros registrados</p>
          <p className="text-sm mt-1">
            {statusFilter !== "todos" ? "Probá con otro filtro" : "Registrá el primer cobro"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPayments?.map(payment => (
            <Card key={payment.id} className="hover:shadow-sm transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-xl shrink-0",
                    payment.method === "efectivo" ? "bg-green-100" : "bg-blue-100"
                  )}>
                    {payment.method === "efectivo"
                      ? <Banknote className={cn("h-5 w-5", "text-green-700")} />
                      : <CreditCard className={cn("h-5 w-5", "text-blue-700")} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">
                      {payment.ownerName ?? "Sin propietario"}
                    </p>
                    {payment.description && (
                      <p className="text-xs text-muted-foreground truncate">{payment.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {payment.method === "efectivo" ? "Efectivo" : payment.method === "transferencia" ? "Transferencia" : "Otro"}{" "}
                      · {payment.paidAt
                        ? format(new Date(payment.paidAt), "d MMM yyyy", { locale: es })
                        : format(new Date(payment.createdAt), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                    <p className="font-bold text-base">
                      ${Number(payment.amount).toLocaleString("es-AR")}
                    </p>
                    <PaymentStatusBadge status={payment.status as "pagado" | "pendiente" | "parcial"} />
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => setEditingId(payment.id)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar cobro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground"
                            onClick={() => deleteMutation.mutate({ id: payment.id })}
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
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
            <DialogTitle>Registrar cobro</DialogTitle>
          </DialogHeader>
          <PaymentForm
            onSubmit={handleCreate(onCreateSubmit as any)}
            register={registerCreate as any}
            control={controlCreate as any}
            isPending={createMutation.isPending}
            onCancel={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingId} onOpenChange={() => { setEditingId(null); resetEdit(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar cobro</DialogTitle>
          </DialogHeader>
          <PaymentForm
            onSubmit={handleEdit(onEditSubmit as any)}
            register={registerEdit as any}
            control={controlEdit as any}
            isPending={updateMutation.isPending}
            onCancel={() => { setEditingId(null); resetEdit(); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
