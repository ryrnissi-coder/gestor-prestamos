import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { useLocation } from "wouter";
import { ArrowLeft, Calculator, Banknote } from "lucide-react";

function generatePreview(
  amount: number,
  rate: number,
  type: string,
  periods: number
): { totalInterest: number; totalPayment: number; firstPayment: number } {
  if (!amount || !rate || !periods) return { totalInterest: 0, totalPayment: 0, firstPayment: 0 };
  const r = rate / 100;
  if (type === "simple") {
    const totalInterest = amount * r * periods;
    const totalPayment = amount + totalInterest;
    const firstPayment = amount / periods + amount * r;
    return { totalInterest, totalPayment, firstPayment };
  } else {
    if (r === 0) {
      return { totalInterest: 0, totalPayment: amount, firstPayment: amount / periods };
    }
    const pmt = (amount * r * Math.pow(1 + r, periods)) / (Math.pow(1 + r, periods) - 1);
    const totalPayment = pmt * periods;
    const totalInterest = totalPayment - amount;
    return { totalInterest, totalPayment, firstPayment: pmt };
  }
}

export default function NewLoan() {
  const [, setLocation] = useLocation();
  const { data: borrowers } = trpc.borrowers.list.useQuery();

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    borrowerId: "",
    amount: "",
    interestRate: "",
    interestType: "simple",
    paymentFrequency: "monthly",
    termPeriods: "",
    startDate: today,
    notes: "",
  });

  const preview = useMemo(() => {
    return generatePreview(
      parseFloat(form.amount) || 0,
      parseFloat(form.interestRate) || 0,
      form.interestType,
      parseInt(form.termPeriods) || 0
    );
  }, [form.amount, form.interestRate, form.interestType, form.termPeriods]);

  const createMutation = trpc.loans.create.useMutation({
    onSuccess: (data) => {
      toast.success("Préstamo creado exitosamente");
      setLocation(`/loans/${data.loanId}`);
    },
    onError: (e) => toast.error("Error al crear préstamo: " + e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.borrowerId) { toast.error("Selecciona un cliente"); return; }
    createMutation.mutate({
      borrowerId: parseInt(form.borrowerId),
      amount: parseFloat(form.amount),
      interestRate: parseFloat(form.interestRate),
      interestType: form.interestType as "simple" | "compound",
      paymentFrequency: form.paymentFrequency as "weekly" | "biweekly" | "monthly",
      termPeriods: parseInt(form.termPeriods),
      startDate: form.startDate,
      notes: form.notes || undefined,
    });
  }

  return (
    <div className="space-y-5 p-1 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/loans")} className="h-9 w-9">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nuevo Préstamo</h1>
          <p className="text-sm text-muted-foreground">Configura los términos del préstamo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card className="border border-border shadow-sm">
            <CardContent className="p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Cliente */}
                <div className="space-y-1.5">
                  <Label htmlFor="borrower">Cliente *</Label>
                  <Select value={form.borrowerId} onValueChange={(v) => setForm({ ...form, borrowerId: v })}>
                    <SelectTrigger id="borrower">
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
                  {borrowers?.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No hay clientes.{" "}
                      <button type="button" className="text-primary underline" onClick={() => setLocation("/borrowers")}>
                        Crear uno primero
                      </button>
                    </p>
                  )}
                </div>

                {/* Monto y Tasa */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="amount">Monto ($) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      required
                      placeholder="1000.00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rate">Tasa de Interés (%) *</Label>
                    <Input
                      id="rate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.interestRate}
                      onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                      required
                      placeholder="5.00"
                    />
                    <p className="text-xs text-muted-foreground">Por período de pago</p>
                  </div>
                </div>

                {/* Tipo de interés y frecuencia */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Tipo de Interés *</Label>
                    <Select value={form.interestType} onValueChange={(v) => setForm({ ...form, interestType: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Interés Simple</SelectItem>
                        <SelectItem value="compound">Interés Compuesto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Frecuencia de Pago *</Label>
                    <Select value={form.paymentFrequency} onValueChange={(v) => setForm({ ...form, paymentFrequency: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="biweekly">Quincenal</SelectItem>
                        <SelectItem value="monthly">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Plazo y Fecha */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="periods">Número de Cuotas *</Label>
                    <Input
                      id="periods"
                      type="number"
                      min="1"
                      step="1"
                      value={form.termPeriods}
                      onChange={(e) => setForm({ ...form, termPeriods: e.target.value })}
                      required
                      placeholder="12"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate">Fecha de Inicio *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Notas */}
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Observaciones del préstamo..."
                    rows={2}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setLocation("/loans")} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} className="flex-1 gap-2">
                    <Banknote className="h-4 w-4" />
                    {createMutation.isPending ? "Creando..." : "Crear Préstamo"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div>
          <Card className="border border-border shadow-sm sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                Vista Previa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {preview.totalPayment > 0 ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Capital</span>
                      <span className="font-medium">{formatCurrency(parseFloat(form.amount) || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Interés</span>
                      <span className="font-medium text-destructive">{formatCurrency(preview.totalInterest)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-sm">
                      <span className="font-semibold">Total a Pagar</span>
                      <span className="font-bold text-foreground">{formatCurrency(preview.totalPayment)}</span>
                    </div>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                    <p className="text-xs text-muted-foreground mb-1">Primera cuota aprox.</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(preview.firstPayment)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {form.termPeriods || 0} cuotas ·{" "}
                    {form.paymentFrequency === "weekly" ? "Semanal" : form.paymentFrequency === "biweekly" ? "Quincenal" : "Mensual"}
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2">
                  <Calculator className="h-8 w-8 opacity-30" />
                  <p className="text-xs text-center">Ingresa los datos del préstamo para ver la vista previa</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
