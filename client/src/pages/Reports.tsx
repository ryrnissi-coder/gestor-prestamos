import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, getLoanStatusLabel, getFrequencyLabel, getPaymentMethodLabel } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocation } from "wouter";
import { BarChart3, ExternalLink, TrendingUp, Coins, Banknote, Users, ShieldCheck } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

export default function Reports() {
  const [, setLocation] = useLocation();
  const [loanStatus, setLoanStatus] = useState("all");
  const [borrowerFilter, setBorrowerFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data: loans, isLoading: loansLoading } = trpc.loans.list.useQuery(
    loanStatus !== "all" ? { status: loanStatus as any } : undefined
  );
  const { data: payments, isLoading: paymentsLoading } = trpc.payments.list.useQuery({
    from: fromDate || undefined,
    to: toDate || undefined,
    borrowerId: borrowerFilter !== "all" ? parseInt(borrowerFilter) : undefined,
  });
  const { data: borrowers } = trpc.borrowers.list.useQuery();

  const borrowerMap = new Map(borrowers?.map((b) => [b.id, `${b.firstName} ${b.lastName}`]) ?? []);

  // Filtrar préstamos por cliente
  const filteredLoans = useMemo(() => {
    if (!loans) return [];
    if (borrowerFilter !== "all") {
      return loans.filter((l) => l.borrowerId === parseInt(borrowerFilter));
    }
    return loans;
  }, [loans, borrowerFilter]);

  // Agrupar pagos por mes para gráfico
  const paymentsByMonth = useMemo(() => {
    if (!payments) return [];
    const map = new Map<string, number>();
    payments.forEach((p) => {
      const d = new Date((p.paymentDate as unknown as string) + "T00:00:00");
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) ?? 0) + parseFloat(p.amount as string));
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, total]) => ({ month, total: Math.round(total * 100) / 100 }));
  }, [payments]);

  // Resumen de préstamos por estado
  const loansByStatus = useMemo(() => {
    if (!filteredLoans) return [];
    const map = new Map<string, { count: number; total: number }>();
    filteredLoans.forEach((l) => {
      const cur = map.get(l.status) ?? { count: 0, total: 0 };
      map.set(l.status, { count: cur.count + 1, total: cur.total + parseFloat(l.amount as string) });
    });
    return Array.from(map.entries()).map(([status, data]) => ({
      status: getLoanStatusLabel(status),
      count: data.count,
      total: data.total,
    }));
  }, [filteredLoans]);

  const totalLoanAmount = filteredLoans.reduce((s, l) => s + parseFloat(l.amount as string), 0);
  const totalPayments = payments?.reduce((s, p) => s + parseFloat(p.amount as string), 0) ?? 0;
  const totalInsurance = filteredLoans.reduce((s, l) => s + parseFloat(l.insuranceAmount as string ?? "0") * l.termPeriods, 0);

  return (
    <div className="space-y-5 p-1">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Análisis financiero de tu cartera</p>
      </div>

      {/* Filters */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Cliente</Label>
              <Select value={borrowerFilter} onValueChange={setBorrowerFilter}>
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  {borrowers?.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.firstName} {b.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Estado Préstamo</Label>
              <Select value={loanStatus} onValueChange={setLoanStatus}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="paid">Pagados</SelectItem>
                  <SelectItem value="overdue">Vencidos</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Pagos desde</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-36 h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-36 h-8 text-xs" />
            </div>
            {(fromDate || toDate || borrowerFilter !== "all" || loanStatus !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => { setFromDate(""); setToDate(""); setBorrowerFilter("all"); setLoanStatus("all"); }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Banknote className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Préstamos</p>
            </div>
            <p className="text-2xl font-bold">{filteredLoans.length}</p>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <p className="text-xs text-muted-foreground">Capital Total</p>
            </div>
            <p className="text-xl font-bold">{formatCurrency(totalLoanAmount)}</p>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="h-4 w-4 text-success" />
              <p className="text-xs text-muted-foreground">Cobros (período)</p>
            </div>
            <p className="text-xl font-bold text-success">{formatCurrency(totalPayments)}</p>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-muted-foreground">Clientes</p>
            </div>
            <p className="text-2xl font-bold">{borrowers?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Desglose de Seguro */}
      {totalInsurance > 0 && (
        <Card className="border border-blue-200 bg-blue-50/40 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">Total Seguros en Cartera</p>
                <p className="text-xs text-blue-600">Suma de todos los seguros por cuota en los préstamos filtrados</p>
              </div>
              <p className="ml-auto text-xl font-bold text-blue-700">{formatCurrency(totalInsurance)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts & Tables */}
      <Tabs defaultValue="loans">
        <TabsList className="h-9">
          <TabsTrigger value="loans" className="text-xs">Préstamos</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs">Cobros</TabsTrigger>
          <TabsTrigger value="chart" className="text-xs">Gráficos</TabsTrigger>
        </TabsList>

        {/* Loans Tab */}
        <TabsContent value="loans" className="mt-4">
          <Card className="border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Cliente</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Monto</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Frecuencia</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Inicio</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Estado</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Ver</th>
                  </tr>
                </thead>
                <tbody>
                  {loansLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-full" /></td>
                        ))}
                      </tr>
                    ))
                  ) : filteredLoans.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">
                        No hay préstamos con los filtros seleccionados
                      </td>
                    </tr>
                  ) : (
                    filteredLoans.map((l) => (
                      <tr key={l.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">#{l.id}</td>
                        <td className="px-4 py-2.5 font-medium">{borrowerMap.get(l.borrowerId) ?? `#${l.borrowerId}`}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(l.amount)}</td>
                        <td className="px-4 py-2.5 hidden md:table-cell text-xs text-muted-foreground">{getFrequencyLabel(l.paymentFrequency)} · {l.termPeriods} cuotas</td>
                        <td className="px-4 py-2.5 hidden lg:table-cell text-xs text-muted-foreground">{formatDate(l.startDate as unknown as string)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            l.status === "active" ? "bg-green-100 text-green-700 border-green-200" :
                            l.status === "paid" ? "bg-blue-100 text-blue-700 border-blue-200" :
                            l.status === "overdue" ? "bg-red-100 text-red-700 border-red-200" :
                            "bg-gray-100 text-gray-600 border-gray-200"
                          }`}>
                            {getLoanStatusLabel(l.status)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLocation(`/loans/${l.id}`)}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredLoans.length > 0 && (
                  <tfoot>
                    <tr className="border-t bg-muted/20">
                      <td colSpan={2} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">TOTAL</td>
                      <td className="px-4 py-2.5 text-right text-sm font-bold">{formatCurrency(totalLoanAmount)}</td>
                      <td colSpan={4} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-4">
          <Card className="border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Cliente</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Préstamo</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Monto</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Método</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-full" /></td>
                        ))}
                      </tr>
                    ))
                  ) : payments?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">
                        No hay cobros en el período seleccionado
                      </td>
                    </tr>
                  ) : (
                    payments?.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-medium">{borrowerMap.get(p.borrowerId) ?? `#${p.borrowerId}`}</td>
                        <td className="px-4 py-2.5 hidden md:table-cell text-xs text-muted-foreground">#{p.loanId}</td>
                        <td className="px-4 py-2.5 text-sm">{formatDate(p.paymentDate as unknown as string)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-success">{formatCurrency(p.amount)}</td>
                        <td className="px-4 py-2.5 hidden lg:table-cell text-xs text-muted-foreground">{getPaymentMethodLabel(p.paymentMethod)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {(payments?.length ?? 0) > 0 && (
                  <tfoot>
                    <tr className="border-t bg-muted/20">
                      <td colSpan={3} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">TOTAL COBRADO</td>
                      <td className="px-4 py-2.5 text-right text-sm font-bold text-success">{formatCurrency(totalPayments)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="chart" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Payments by month */}
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Cobros por Mes</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentsByMonth.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                    Sin datos de cobros
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={paymentsByMonth} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 240)" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip formatter={(v: number) => [formatCurrency(v), "Cobrado"]} />
                      <Bar dataKey="total" fill="oklch(0.52 0.15 145)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Loans by status */}
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Préstamos por Estado</CardTitle>
              </CardHeader>
              <CardContent>
                {loansByStatus.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                    Sin datos de préstamos
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    {loansByStatus.map((item) => (
                      <div key={item.status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-foreground">{item.status}</span>
                          <span className="text-xs text-muted-foreground">({item.count})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${Math.min(100, (item.count / filteredLoans.length) * 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold w-24 text-right">{formatCurrency(item.total)}</span>
                        </div>
                      </div>
                    ))}
                    <div className="border-t pt-2 flex justify-between text-sm">
                      <span className="font-semibold text-muted-foreground">Total</span>
                      <span className="font-bold">{formatCurrency(totalLoanAmount)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
