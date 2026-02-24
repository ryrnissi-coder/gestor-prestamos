import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, getLoanStatusLabel, getFrequencyLabel, getInterestTypeLabel } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocation } from "wouter";
import { Banknote, Plus, Search, Eye, Calendar, Percent } from "lucide-react";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  paid: "bg-blue-100 text-blue-700 border-blue-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function Loans() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: loans, isLoading } = trpc.loans.list.useQuery(
    statusFilter !== "all" ? { status: statusFilter as any } : undefined
  );
  const { data: borrowers } = trpc.borrowers.list.useQuery();

  const borrowerMap = new Map(borrowers?.map((b) => [b.id, `${b.firstName} ${b.lastName}`]) ?? []);

  const filtered = loans?.filter((l) => {
    const name = borrowerMap.get(l.borrowerId) ?? "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-5 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Préstamos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loans?.length ?? 0} préstamos registrados
          </p>
        </div>
        <Button onClick={() => setLocation("/loans/new")} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Préstamo
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="overdue">Vencidos</SelectItem>
            <SelectItem value="paid">Pagados</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Monto</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Condiciones</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Inicio</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acción</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-3"><Skeleton className="h-5 w-36" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-24 ml-auto" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-5 w-32" /></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-10 ml-auto" /></td>
                  </tr>
                ))
              ) : filtered?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Banknote className="h-10 w-10 opacity-30" />
                      <p className="text-sm">
                        {search || statusFilter !== "all" ? "No se encontraron préstamos" : "No hay préstamos registrados"}
                      </p>
                      {!search && statusFilter === "all" && (
                        <Button variant="outline" size="sm" onClick={() => setLocation("/loans/new")} className="mt-2 gap-1">
                          <Plus className="h-3.5 w-3.5" />
                          Crear primer préstamo
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered?.map((loan) => (
                  <tr key={loan.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Banknote className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {borrowerMap.get(loan.borrowerId) ?? `Cliente #${loan.borrowerId}`}
                          </p>
                          <p className="text-xs text-muted-foreground">#{loan.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-semibold text-foreground">{formatCurrency(loan.amount)}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Percent className="h-3 w-3" />
                          <span>{parseFloat(loan.interestRate as string).toFixed(2)}% · {getInterestTypeLabel(loan.interestType)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{loan.termPeriods} cuotas · {getFrequencyLabel(loan.paymentFrequency)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">{formatDate(loan.startDate as unknown as string)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[loan.status] ?? ""}`}>
                        {getLoanStatusLabel(loan.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setLocation(`/loans/${loan.id}`)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
