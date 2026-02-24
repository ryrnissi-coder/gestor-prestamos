import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  formatCurrency,
  formatDate,
  getLoanStatusLabel,
  getFrequencyLabel,
  getInterestTypeLabel,
  getPaymentMethodLabel,
  isOverdue,
} from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Plus,
  Banknote,
  Calendar,
  Percent,
  User,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  paid: "bg-blue-100 text-blue-700 border-blue-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function LoanDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const loanId = parseInt(id ?? "0");

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [selectedAmount, setSelectedAmount] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "cash",
    notes: "",
  });

  const utils = trpc.useUtils();

  const { data: loan, isLoading: loanLoading } = trpc.loans.get.useQuery(
    { id: loanId },
    { enabled: !!loanId }
  );
  const { data: schedule, isLoading: scheduleLoading } = trpc.loans.getSchedule.useQuery(
    { loanId },
    { enabled: !!loanId }
  );
  const { data: payments, isLoading: paymentsLoading } = trpc.payments.list.useQuery(
    { loanId },
    { enabled: !!loanId }
  );
  const { data: borrower } = trpc.borrowers.get.useQuery(
    { id: loan?.borrowerId ?? 0 },
    { enabled: !!loan?.borrowerId }
  );

  const markPaidMutation = trpc.loans.markPaid.useMutation({
    onSuccess: () => {
      utils.loans.getSchedule.invalidate({ loanId });
      utils.payments.list.invalidate({ loanId });
      utils.dashboard.stats.invalidate();
      toast.success("Cuota marcada como pagada");
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const markUnpaidMutation = trpc.loans.markUnpaid.useMutation({
    onSuccess: () => {
      utils.loans.getSchedule.invalidate({ loanId });
      toast.success("Cuota marcada como pendiente");
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const deleteLoanMutation = trpc.loans.delete.useMutation({
    onSuccess: () => {
      toast.success("Préstamo eliminado");
      setLocation("/loans");
    },
    onError: (e) => toast.error("Error al eliminar: " + e.message),
  });

  const updateStatusMutation = trpc.loans.updateStatus.useMutation({
    onSuccess: () => {
      utils.loans.get.invalidate({ id: loanId });
      utils.dashboard.stats.invalidate();
      toast.success("Estado actualizado");
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const createPaymentMutation = trpc.payments.create.useMutation({
    onSuccess: () => {
      utils.payments.list.invalidate({ loanId });
      utils.loans.getSchedule.invalidate({ loanId });
      utils.dashboard.stats.invalidate();
      toast.success("Pago registrado exitosamente");
      setShowPaymentDialog(false);
      setPaymentForm({ amount: "", paymentDate: new Date().toISOString().split("T")[0], paymentMethod: "cash", notes: "" });
      setSelectedScheduleId(null);
    },
    onError: (e) => toast.error("Error al registrar pago: " + e.message),
  });

  function openPaymentDialog(scheduleId?: number, amount?: string) {
    setSelectedScheduleId(scheduleId ?? null);
    setPaymentForm({
      amount: amount ?? "",
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "cash",
      notes: "",
    });
    setShowPaymentDialog(true);
  }

  function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!loan) return;
    createPaymentMutation.mutate({
      loanId,
      borrowerId: loan.borrowerId,
      scheduleId: selectedScheduleId ?? undefined,
      amount: parseFloat(paymentForm.amount),
      paymentDate: paymentForm.paymentDate,
      paymentMethod: paymentForm.paymentMethod as any,
      notes: paymentForm.notes || undefined,
    });
  }

  const paidCount = schedule?.filter((r) => r.isPaid).length ?? 0;
  const totalCount = schedule?.length ?? 0;
  const progressPct = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
  const totalPaid = payments?.reduce((s, p) => s + parseFloat(p.amount as string), 0) ?? 0;
  const totalScheduled = schedule?.reduce((s, r) => s + parseFloat(r.totalPayment as string), 0) ?? 0;

  if (loanLoading) {
    return (
      <div className="space-y-5 p-1">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p className="text-muted-foreground">Préstamo no encontrado</p>
        <Button variant="outline" onClick={() => setLocation("/loans")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Préstamos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-1">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/loans")} className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Préstamo #{loan.id}
            </h1>
            <p className="text-sm text-muted-foreground">
              {borrower ? `${borrower.firstName} ${borrower.lastName}` : `Cliente #${loan.borrowerId}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[loan.status] ?? ""}`}>
            {getLoanStatusLabel(loan.status)}
          </span>
          <Select value={loan.status} onValueChange={(v) => updateStatusMutation.mutate({ id: loanId, status: v as any })}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="paid">Pagado</SelectItem>
              <SelectItem value="overdue">Vencido</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="gap-1.5" onClick={() => openPaymentDialog()}>
            <Plus className="h-3.5 w-3.5" />
            Registrar Pago
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Banknote className="h-3 w-3" /> Capital
            </p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(loan.amount)}</p>
            {parseFloat(loan.insuranceAmount as string) > 0 && (
              <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                Seguro: {formatCurrency(loan.insuranceAmount)} / cuota
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Percent className="h-3 w-3" /> Tasa / Período
            </p>
            <p className="text-xl font-bold text-foreground">{parseFloat(loan.interestRate as string).toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground">{getInterestTypeLabel(loan.interestType)}</p>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Plazo
            </p>
            <p className="text-xl font-bold text-foreground">{loan.termPeriods}</p>
            <p className="text-xs text-muted-foreground">{getFrequencyLabel(loan.paymentFrequency)}</p>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Progreso
            </p>
            <p className="text-xl font-bold text-foreground">{paidCount}/{totalCount}</p>
            <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
          <User className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Cliente</p>
            <p className="text-sm font-medium text-foreground">
              {borrower ? `${borrower.firstName} ${borrower.lastName}` : "-"}
            </p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Fecha de Inicio</p>
            <p className="text-sm font-medium text-foreground">{formatDate(loan.startDate as unknown as string)}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
          <Banknote className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Total Cobrado</p>
            <p className="text-sm font-medium text-success">{formatCurrency(totalPaid)} / {formatCurrency(totalScheduled)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="schedule">
        <TabsList className="h-9">
          <TabsTrigger value="schedule" className="text-xs">Tabla de Amortización</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs">Historial de Pagos</TabsTrigger>
        </TabsList>

        {/* Amortization Schedule */}
        <TabsContent value="schedule" className="mt-4">
          <Card className="border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground w-12">#</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Vencimiento</th>
                    <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Capital</th>
                    <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Interés</th>
                    <th className="text-right px-3 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Seguro</th>
                    <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Cuota</th>
                    <th className="text-right px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Saldo</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Estado</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-3 py-2.5"><Skeleton className="h-4 w-full" /></td>
                        ))}
                      </tr>
                    ))
                  ) : schedule?.map((row) => {
                    const overdue = !row.isPaid && isOverdue(row.dueDate as unknown as string);
                    return (
                      <tr
                        key={row.id}
                        className={`border-b transition-colors ${
                          row.isPaid
                            ? "bg-green-50/40"
                            : overdue
                            ? "bg-red-50/40"
                            : "hover:bg-muted/20"
                        }`}
                      >
                        <td className="px-3 py-2.5 text-center text-muted-foreground text-xs">{row.periodNumber}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs ${overdue ? "text-destructive font-medium" : "text-foreground"}`}>
                            {formatDate(row.dueDate as unknown as string)}
                          </span>
                          {overdue && <AlertTriangle className="h-3 w-3 text-destructive inline ml-1" />}
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs">{formatCurrency(row.principalAmount)}</td>
                        <td className="px-3 py-2.5 text-right text-xs text-destructive">{formatCurrency(row.interestAmount)}</td>
                        <td className="px-3 py-2.5 text-right text-xs text-blue-600 hidden lg:table-cell">
                          {parseFloat(row.insuranceAmount as string) > 0 ? formatCurrency(row.insuranceAmount) : <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs font-semibold">{formatCurrency(row.totalPayment)}</td>
                        <td className="px-3 py-2.5 text-right text-xs hidden md:table-cell text-muted-foreground">{formatCurrency(row.remainingBalance)}</td>
                        <td className="px-3 py-2.5 text-center">
                          {row.isPaid ? (
                            <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
                          ) : overdue ? (
                            <AlertTriangle className="h-4 w-4 text-destructive mx-auto" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground mx-auto" />
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {row.isPaid ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-muted-foreground"
                              onClick={() => markUnpaidMutation.mutate({ scheduleId: row.id })}
                            >
                              Desmarcar
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => openPaymentDialog(row.id, row.totalPayment as string)}
                            >
                              <Plus className="h-3 w-3" />
                              Pagar
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Payments History */}
        <TabsContent value="payments" className="mt-4">
          <Card className="border border-border shadow-sm overflow-hidden">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Pagos Registrados</CardTitle>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openPaymentDialog()}>
                <Plus className="h-3.5 w-3.5" />
                Registrar Pago
              </Button>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Monto</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Método</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td className="px-4 py-2.5"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-4 py-2.5"><Skeleton className="h-4 w-20 ml-auto" /></td>
                        <td className="px-4 py-2.5 hidden md:table-cell"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-4 py-2.5 hidden lg:table-cell"><Skeleton className="h-4 w-32" /></td>
                      </tr>
                    ))
                  ) : payments?.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Banknote className="h-8 w-8 opacity-30" />
                          <p className="text-sm">Sin pagos registrados</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    payments?.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 text-sm">{formatDate(p.paymentDate as unknown as string)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-success">{formatCurrency(p.amount)}</td>
                        <td className="px-4 py-2.5 hidden md:table-cell">
                          <span className="text-xs text-muted-foreground">{getPaymentMethodLabel(p.paymentMethod)}</span>
                        </td>
                        <td className="px-4 py-2.5 hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">{p.notes ?? "-"}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pAmount">Monto (₡) *</Label>
                <Input
                  id="pAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pDate">Fecha *</Label>
                <Input
                  id="pDate"
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Método de Pago</Label>
              <Select value={paymentForm.paymentMethod} onValueChange={(v) => setPaymentForm({ ...paymentForm, paymentMethod: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="check">Cheque</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pNotes">Notas</Label>
              <Textarea
                id="pNotes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Observaciones del pago..."
                rows={2}
              />
            </div>
            {selectedScheduleId && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                Este pago se asociará a la cuota #{schedule?.find((r) => r.id === selectedScheduleId)?.periodNumber} y la marcará como pagada.
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPaymentDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createPaymentMutation.isPending}>
                {createPaymentMutation.isPending ? "Guardando..." : "Registrar Pago"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Loan Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este préstamo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es permanente. Se eliminará el préstamo #{loan.id}, toda su tabla de amortización y todos los pagos registrados. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteLoanMutation.mutate({ id: loanId })}
              disabled={deleteLoanMutation.isPending}
            >
              {deleteLoanMutation.isPending ? "Eliminando..." : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
