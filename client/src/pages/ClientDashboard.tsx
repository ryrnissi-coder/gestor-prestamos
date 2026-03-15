import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock, DollarSign, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ClientDashboard() {
  const { user } = useAuth();
  const { data: loan, isLoading } = trpc.borrowerClient.getLoan.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando tu información...</p>
        </div>
      </div>
    );
  }

  // El cliente ya solo ve su préstamo

  if (!loan) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Mi Préstamo</h1>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No tienes préstamos registrados. Por favor contacta con el administrador.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-blue-500">Activo</Badge>;
      case "paid":
        return <Badge className="bg-green-500">Pagado</Badge>;
      case "overdue":
        return <Badge className="bg-red-500">Vencido</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getInterestTypeLabel = (type: string) => {
    return type === "simple" ? "Interés Simple" : "Interés Compuesto";
  };

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case "weekly":
        return "Semanal";
      case "biweekly":
        return "Quincenal";
      case "monthly":
        return "Mensual";
      default:
        return freq;
    }
  };

  // Obtener tabla de amortización
  const { data: schedule } = trpc.borrowerClient.getSchedule.useQuery();

  const paidCount = schedule?.filter((row) => row.isPaid).length || 0;
  const totalCount = schedule?.length || 0;
  const nextDueRow = schedule?.find((row) => !row.isPaid);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mi Préstamo</h1>
            <p className="text-muted-foreground mt-1">Préstamo #{loan.id}</p>
          </div>
          <div>{getStatusBadge(loan.status)}</div>
        </div>

        {/* Resumen del Préstamo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monto del Préstamo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(loan.amount)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de Interés</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{parseFloat(loan.interestRate as string).toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground mt-1">{getInterestTypeLabel(loan.interestType)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cuotas Pagadas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {paidCount}/{totalCount}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${totalCount > 0 ? (paidCount / totalCount) * 100 : 0}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Próxima Cuota</CardTitle>
            </CardHeader>
            <CardContent>
              {nextDueRow ? (
                <>
                  <p className="text-2xl font-bold">{formatCurrency(nextDueRow.totalPayment)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(nextDueRow.dueDate)}</p>
                </>
              ) : (
                <p className="text-2xl font-bold text-green-600">Completado</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detalles del Préstamo */}
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Préstamo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Cantidad de Cuotas</p>
                <p className="text-lg font-semibold">{loan.termPeriods}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Frecuencia</p>
                <p className="text-lg font-semibold">{getFrequencyLabel(loan.paymentFrequency)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Inicio</p>
                <p className="text-lg font-semibold">{formatDate(loan.startDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Seguro por Cuota</p>
                <p className="text-lg font-semibold">{formatCurrency(loan.insuranceAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Amortización */}
        {schedule && schedule.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tabla de Amortización</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pending" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="pending">Pendientes</TabsTrigger>
                  <TabsTrigger value="paid">Pagadas</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2">Cuota</th>
                          <th className="text-right py-2 px-2">Fecha</th>
                          <th className="text-right py-2 px-2">Capital</th>
                          <th className="text-right py-2 px-2">Interés</th>
                          <th className="text-right py-2 px-2">Seguro</th>
                          <th className="text-right py-2 px-2">Total</th>
                          <th className="text-right py-2 px-2">Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedule
                          .filter((row) => !row.isPaid)
                          .map((row) => (
                            <tr key={row.id} className="border-b hover:bg-muted/50">
                              <td className="py-2 px-2">{row.periodNumber}</td>
                              <td className="text-right py-2 px-2">{formatDate(row.dueDate)}</td>
                              <td className="text-right py-2 px-2">{formatCurrency(row.principalAmount)}</td>
                              <td className="text-right py-2 px-2 text-red-600">{formatCurrency(row.interestAmount)}</td>
                              <td className="text-right py-2 px-2 text-blue-600">{formatCurrency(row.insuranceAmount)}</td>
                              <td className="text-right py-2 px-2 font-semibold">{formatCurrency(row.totalPayment)}</td>
                              <td className="text-right py-2 px-2">{formatCurrency(row.remainingBalance)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="paid" className="mt-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2">Cuota</th>
                          <th className="text-right py-2 px-2">Fecha</th>
                          <th className="text-right py-2 px-2">Capital</th>
                          <th className="text-right py-2 px-2">Interés</th>
                          <th className="text-right py-2 px-2">Seguro</th>
                          <th className="text-right py-2 px-2">Total</th>
                          <th className="text-right py-2 px-2">Pagada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedule
                          .filter((row) => row.isPaid)
                          .map((row) => (
                            <tr key={row.id} className="border-b hover:bg-muted/50 bg-green-50">
                              <td className="py-2 px-2">{row.periodNumber}</td>
                              <td className="text-right py-2 px-2">{formatDate(row.dueDate)}</td>
                              <td className="text-right py-2 px-2">{formatCurrency(row.principalAmount)}</td>
                              <td className="text-right py-2 px-2 text-red-600">{formatCurrency(row.interestAmount)}</td>
                              <td className="text-right py-2 px-2 text-blue-600">{formatCurrency(row.insuranceAmount)}</td>
                              <td className="text-right py-2 px-2 font-semibold">{formatCurrency(row.totalPayment)}</td>
                              <td className="text-right py-2 px-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600 inline" />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Notas */}
        {loan.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{loan.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
