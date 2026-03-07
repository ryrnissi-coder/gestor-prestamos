import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, getLoanStatusLabel, getFrequencyLabel } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Phone, Mail, MapPin, IdCard, Banknote, Plus, MessageCircle, UserPlus, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
  const [invitationOpen, setInvitationOpen] = useState(false);
  const [invitationLink, setInvitationLink] = useState("");
  const [copied, setCopied] = useState(false);

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

  const createInvitation = trpc.invitations.create.useMutation({
    onSuccess: (data) => {
      const link = `${window.location.origin}/register?token=${data.token}`;
      setInvitationLink(link);
      toast.success("Invitación creada");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al crear invitación");
    },
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(invitationLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Enlace copiado al portapapeles");
  };

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
      <div className="flex items-center justify-between gap-3">
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
        <Dialog open={invitationOpen} onOpenChange={setInvitationOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Enviar Invitación
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Invitación al Cliente</DialogTitle>
              <DialogDescription>
                Genera un enlace de invitación para que {borrower.firstName} pueda registrarse y acceder a su préstamo
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {!invitationLink ? (
                <Button
                  onClick={() => createInvitation.mutate({ borrowerId })}
                  disabled={createInvitation.isPending}
                  className="w-full"
                >
                  {createInvitation.isPending ? "Generando..." : "Generar Enlace de Invitación"}
                </Button>
              ) : (
                <>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2">Enlace de invitación:</p>
                    <p className="text-sm break-all font-mono">{invitationLink}</p>
                  </div>
                  <Button onClick={handleCopyLink} className="w-full gap-2">
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copiar Enlace
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Info Card */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Información de Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${borrower.email}`} className="text-sm text-blue-600 hover:underline break-all">
                {borrower.email}
              </a>
            </div>
            {borrower.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${borrower.phone}`} className="text-sm text-blue-600 hover:underline">
                  {borrower.phone}
                </a>
              </div>
            )}
            {borrower.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-sm text-muted-foreground">{borrower.address}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ID Card */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Identificación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Número de ID</p>
              <p className="text-sm font-medium">{borrower.idNumber}</p>
            </div>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resumen Financiero</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Total Prestado</p>
              <p className="text-lg font-bold">{formatCurrency(totalBorrowed)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pagado</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(totalPaid)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loans Section */}
      {!loansLoading && loans && loans.length > 0 && (
        <Card className="border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Préstamos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loans.map((loan) => (
                <div
                  key={loan.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => setLocation(`/loans/${loan.id}`)}
                >
                  <div className="flex-1">
                    <p className="font-medium">Préstamo #{loan.id}</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(loan.amount)}</p>
                  </div>
                  <div className="text-right">
                    <Badge className={statusColors[loan.status] || ""}>{getLoanStatusLabel(loan.status)}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{loan.termPeriods} cuotas</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
