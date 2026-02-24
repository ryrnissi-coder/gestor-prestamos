import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, getLoanStatusLabel, getFrequencyLabel } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import {
  Banknote,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  ArrowRight,
  Coins,
  MessageCircle,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

// ─── Utilidad para generar enlace de WhatsApp ─────────────────────────────────
function buildWhatsAppUrl(phone: string | null | undefined, message: string): string {
  const cleaned = (phone ?? "").replace(/\D/g, "");
  const encoded = encodeURIComponent(message);
  if (cleaned) {
    return `https://wa.me/${cleaned}?text=${encoded}`;
  }
  // Sin número: abre WhatsApp Web con el mensaje listo para elegir contacto
  return `https://web.whatsapp.com/send?text=${encoded}`;
}

function buildReminderMessage(
  firstName: string,
  lastName: string,
  frequency: string
): string {
  const freqLabel = getFrequencyLabel(frequency);
  return (
    `Estimado(a) ${firstName} ${lastName}, este mensaje es para recordarle que se encuentra pendiente su cuota ${freqLabel} de su compromiso de pago con nosotros, favor realizarlo a la brevedad. En caso de haberlo realizado, favor enviar el comprobante para la aplicación.`
  );
}

// ─── WhatsApp Button ──────────────────────────────────────────────────────────
function WhatsAppButton({
  phone,
  firstName,
  lastName,
  frequency,
}: {
  phone: string | null | undefined;
  firstName: string;
  lastName: string;
  frequency: string;
}) {
  const message = buildReminderMessage(firstName, lastName, frequency);
  const url = buildWhatsAppUrl(phone, message);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title="Enviar recordatorio por WhatsApp"
      className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors shrink-0"
    >
      <MessageCircle className="h-3.5 w-3.5" />
    </a>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}) {
  return (
    <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-28 mb-1" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{value}</p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ml-3 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: overdueItems, isLoading: overdueLoading } = trpc.dashboard.overdueItems.useQuery();
  const { data: upcomingItems, isLoading: upcomingLoading } = trpc.dashboard.upcomingItems.useQuery();
  const { data: borrowers } = trpc.borrowers.list.useQuery();

  const borrowerMap = new Map(borrowers?.map((b) => [b.id, `${b.firstName} ${b.lastName}`]) ?? []);

  const pieData = stats
    ? [
        { name: "Activos", value: stats.activeLoans, color: "oklch(0.52 0.15 145)" },
        { name: "Vencidos", value: stats.overdueLoans, color: "oklch(0.55 0.22 25)" },
        { name: "Pagados", value: stats.paidLoans, color: "oklch(0.55 0.14 255)" },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Resumen general de tu cartera de préstamos
          </p>
        </div>
        <Button onClick={() => setLocation("/loans/new")} size="sm" className="gap-2">
          <Banknote className="h-4 w-4" />
          Nuevo Préstamo
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Préstamos Activos"
          value={stats?.activeLoans ?? 0}
          subtitle={`de ${stats?.totalLoans ?? 0} en total`}
          icon={Banknote}
          color="bg-blue-50 text-blue-600"
          loading={statsLoading}
        />
        <StatCard
          title="Préstamos Vencidos"
          value={stats?.overdueLoans ?? 0}
          subtitle={stats?.overdueAmount ? formatCurrency(stats.overdueAmount) + " pendiente" : undefined}
          icon={AlertTriangle}
          color="bg-red-50 text-red-600"
          loading={statsLoading}
        />
        <StatCard
          title="Total Desembolsado"
          value={formatCurrency(stats?.totalDisbursed ?? 0)}
          subtitle="Capital prestado"
          icon={TrendingUp}
          color="bg-purple-50 text-purple-600"
          loading={statsLoading}
        />
        <StatCard
          title="Total Cobrado"
          value={formatCurrency(stats?.totalCollected ?? 0)}
          subtitle="Pagos recibidos"
          icon={Coins}
          color="bg-green-50 text-green-600"
          loading={statsLoading}
        />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Estado de Préstamos</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Skeleton className="h-40 w-40 rounded-full" />
              </div>
            ) : pieData.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Banknote className="h-10 w-10 opacity-30" />
                <p className="text-sm">Sin préstamos registrados</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => [val, "Préstamos"]} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Overdue Alerts */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Cuotas Vencidas
            </CardTitle>
            {(overdueItems?.length ?? 0) > 0 && (
              <Badge variant="destructive" className="text-xs">
                {overdueItems?.length}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {overdueLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : overdueItems?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2">
                <CheckCircle2 className="h-8 w-8 text-success opacity-60" />
                <p className="text-sm">Sin cuotas vencidas</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {overdueItems?.map((item) => (
                  <div
                    key={item.scheduleId}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-100 hover:bg-red-100 transition-colors"
                  >
                    {/* Info — clickable */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setLocation(`/loans/${item.loanId}`)}
                    >
                      <p className="text-xs font-medium text-foreground truncate">
                        {item.borrowerFirstName} {item.borrowerLastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cuota #{item.periodNumber} · {formatDate(item.dueDate as unknown as string)}
                      </p>
                    </div>
                    {/* Amount */}
                    <span className="text-xs font-semibold text-destructive shrink-0">
                      {formatCurrency(item.totalPayment as string)}
                    </span>
                    {/* WhatsApp button */}
                    <WhatsAppButton
                      phone={item.borrowerPhone}
                      firstName={item.borrowerFirstName}
                      lastName={item.borrowerLastName}
                      frequency={item.paymentFrequency}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Payments */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              Próximos 7 Días
            </CardTitle>
            {(upcomingItems?.length ?? 0) > 0 && (
              <Badge className="text-xs bg-warning text-warning-foreground">
                {upcomingItems?.length}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {upcomingLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : upcomingItems?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2">
                <CheckCircle2 className="h-8 w-8 opacity-40" />
                <p className="text-sm">Sin vencimientos próximos</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {upcomingItems?.map((item) => (
                  <div
                    key={item.scheduleId}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors"
                  >
                    {/* Info — clickable */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setLocation(`/loans/${item.loanId}`)}
                    >
                      <p className="text-xs font-medium text-foreground truncate">
                        {item.borrowerFirstName} {item.borrowerLastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cuota #{item.periodNumber} · {formatDate(item.dueDate as unknown as string)}
                      </p>
                    </div>
                    {/* Amount */}
                    <span className="text-xs font-semibold text-amber-700 shrink-0">
                      {formatCurrency(item.totalPayment as string)}
                    </span>
                    {/* WhatsApp button */}
                    <WhatsAppButton
                      phone={item.borrowerPhone}
                      firstName={item.borrowerFirstName}
                      lastName={item.borrowerLastName}
                      frequency={item.paymentFrequency}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Ver Clientes", path: "/borrowers", icon: Users, desc: `${borrowers?.length ?? 0} registrados` },
          { label: "Ver Préstamos", path: "/loans", icon: Banknote, desc: `${stats?.totalLoans ?? 0} en total` },
          { label: "Registrar Pago", path: "/payments", icon: CheckCircle2, desc: "Historial de pagos" },
          { label: "Reportes", path: "/reports", icon: TrendingUp, desc: "Análisis financiero" },
        ].map((item) => (
          <Card
            key={item.path}
            className="border border-border shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-primary/30 group"
            onClick={() => setLocation(item.path)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0 group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
