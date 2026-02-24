import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, getPaymentMethodLabel } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useLocation } from "wouter";
import { CreditCard, Plus, Search, ExternalLink } from "lucide-react";

export default function Payments() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    loanId: "",
    borrowerId: "",
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "cash",
    notes: "",
  });

  const utils = trpc.useUtils();
  const { data: payments, isLoading } = trpc.payments.list.useQuery({
    from: fromDate || undefined,
    to: toDate || undefined,
  });
  const { data: borrowers } = trpc.borrowers.list.useQuery();
  const { data: loans } = trpc.loans.list.useQuery();

  const borrowerMap = new Map(borrowers?.map((b) => [b.id, `${b.firstName} ${b.lastName}`]) ?? []);
  const loansByBorrower = loans?.filter((l) => form.borrowerId ? l.borrowerId === parseInt(form.borrowerId) : true) ?? [];

  const createMutation = trpc.payments.create.useMutation({
    onSuccess: () => {
      utils.payments.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("Pago registrado exitosamente");
      setShowDialog(false);
      setForm({ loanId: "", borrowerId: "", amount: "", paymentDate: new Date().toISOString().split("T")[0], paymentMethod: "cash", notes: "" });
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const filtered = payments?.filter((p) => {
    const name = borrowerMap.get(p.borrowerId) ?? "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.loanId || !form.borrowerId) { toast.error("Selecciona cliente y préstamo"); return; }
    createMutation.mutate({
      loanId: parseInt(form.loanId),
      borrowerId: parseInt(form.borrowerId),
      amount: parseFloat(form.amount),
      paymentDate: form.paymentDate,
      paymentMethod: form.paymentMethod as any,
      notes: form.notes || undefined,
    });
  }

  const totalFiltered = filtered?.reduce((s, p) => s + parseFloat(p.amount as string), 0) ?? 0;

  return (
    <div className="space-y-5 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pagos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered?.length ?? 0} pagos · Total: {formatCurrency(totalFiltered)}
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Registrar Pago
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-36"
            placeholder="Desde"
          />
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-36"
            placeholder="Hasta"
          />
          {(fromDate || toDate) && (
            <Button variant="ghost" size="sm" onClick={() => { setFromDate(""); setToDate(""); }}>
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card className="border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Préstamo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Monto</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Método</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Notas</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ver</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <CreditCard className="h-10 w-10 opacity-30" />
                      <p className="text-sm">No se encontraron pagos</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered?.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">
                        {borrowerMap.get(p.borrowerId) ?? `Cliente #${p.borrowerId}`}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">Préstamo #{p.loanId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{formatDate(p.paymentDate as unknown as string)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-success">{formatCurrency(p.amount)}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">{getPaymentMethodLabel(p.paymentMethod)}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">{p.notes ?? "-"}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setLocation(`/loans/${p.loanId}`)}
                        title="Ver préstamo"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <Select value={form.borrowerId} onValueChange={(v) => setForm({ ...form, borrowerId: v, loanId: "" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {borrowers?.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.firstName} {b.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Préstamo *</Label>
              <Select value={form.loanId} onValueChange={(v) => setForm({ ...form, loanId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar préstamo..." />
                </SelectTrigger>
                <SelectContent>
                  {loansByBorrower.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      #{l.id} · {formatCurrency(l.amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Monto (₡) *</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Método de Pago</Label>
              <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
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
              <Label>Notas</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observaciones..."
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Guardando..." : "Registrar Pago"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
