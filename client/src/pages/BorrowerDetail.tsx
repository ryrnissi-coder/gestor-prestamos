import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, getLoanStatusLabel, getFrequencyLabel } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Phone, Mail, MapPin, IdCard, Banknote, Plus, MessageCircle } from "lucide-react";

function buildWhatsAppUrl(phone: string | null | undefined, message: string): string {
  const cleaned = (phone ?? "").replace(/\D/g, "");
  const encoded = encodeURIComponent(message);
  if (cleaned) return `https://wa.me/${cleaned}?text=${encoded}`;
  return `https://web.whatsapp.com/send?text=${encoded}`;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  paid: "bg-blue-100 text-blue-700 border-blue-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function BorrowerDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const borrowerId = parseInt(id ?? "0");

  const { data: borrower, isLoading: borrowerLoading } = trpc.borrowers.get.useQuery(
    { id: borrowerId },
    { enabled: !!borrowerId }
  );
  const { data: loans, isLoading: loansLoading } = trpc.loans.list.useQuery(
    { borrowerId },
    { enabled: !!borrowerId }
  );
  const { data: payments } = trpc.payments.list.useQuery(
    { borrowerId },
    { enabled: !!borrowerId }
  );

  const totalBorrowed = loans?.reduce((s, l) => s + parseFloat(l.amount as string), 0) ?? 0;
  const totalPaid = payments?.reduce((s, p) => s + parseFloat(p.amount as string), 0) ?? 0;

  if (borrowerLoading) {
    return (
      <div className="space-y-5 p-1">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (!borrower) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p className="text-muted-foreground">Cliente no encontrado</p>
        <Button variant="outline" onClick={() => setLocation("/borrowers")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Clientes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-1">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/borrowers")} className="h-9 w-9">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {borrower.firstName} {borrower.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">Perfil del cliente</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Info Card */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Información de Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-primary">
                  {borrower.firstName.charAt(0)}{borrower.lastName.charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-semibold text-foreground">{borrower.firstName} {borrower.lastName}</p>
                <p className="text-xs text-muted-foreground">Registrado {formatDate(borrower.createdAt)}</p>
              </div>
            </div>
            <div className="space-y-2 pt-1">
              {borrower.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1">{borrower.phone}</span>
                  <a
                    href={buildWhatsAppUrl(borrower.phone, `Estimado(a) ${borrower.firstName} ${borrower.lastName}, este mensaje es para recordarle que se encuentra pendiente su cuota de su compromiso de pago con nosotros, favor realizarlo a la brevedad. En caso de haberlo realizado, favor enviar el comprobante para la aplicación.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Enviar mensaje por WhatsApp"
                    className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-green-100 hover:bg-green-200 text-green-700 transition-colors shrink-0"
                  >
                    <MessageCircle className="h-3 w-3" />
                  </a>
                </div>
              )}
              {borrower.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{borrower.email}</span>
                </div>
              )}
              {borrower.idNumber && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <IdCard className="h-3.5 w-3.5 shrink-0" />
                  <span>{borrower.idNumber}</span>
                </div>
              )}
              {borrower.address && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{borrower.address}</span>
                </div>
              )}
              {borrower.notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">{borrower.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 content-start">
          <Card className="border border-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Préstamos</p>
              <p className="text-2xl font-bold text-foreground">{loans?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">en total</p>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Prestado</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totalBorrowed)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">capital</p>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Pagado</p>
              <p className="text-xl font-bold text-success">{formatCurrency(totalPaid)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">recibido</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Loans */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Historial de Préstamos</CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setLocation("/loans/new")}
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo Préstamo
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loansLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : loans?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <Banknote className="h-8 w-8 opacity-30" />
              <p className="text-sm">Sin préstamos registrados</p>
            </div>
          ) : (
            <div className="divide-y">
              {loans?.map((loan) => (
                <div
                  key={loan.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setLocation(`/loans/${loan.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Banknote className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(loan.amount)} · {getFrequencyLabel(loan.paymentFrequency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {loan.termPeriods} cuotas · {parseFloat(loan.interestRate as string).toFixed(2)}% por período
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-muted-foreground hidden sm:block">{formatDate(loan.startDate as unknown as string)}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[loan.status] ?? ""}`}>
                      {getLoanStatusLabel(loan.status)}
                    </span>
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
