import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "₡0,00";
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "-";
  const d = typeof dateStr === "string" ? new Date(dateStr + "T00:00:00") : dateStr;
  return d.toLocaleDateString("es-CR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateFull(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "-";
  const d = typeof dateStr === "string" ? new Date(dateStr + "T00:00:00") : dateStr;
  return d.toLocaleDateString("es-CR", { day: "2-digit", month: "long", year: "numeric" });
}

export function isOverdue(dueDateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + "T00:00:00");
  return due < today;
}

export function isUpcoming(dueDateStr: string, days = 7): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const future = new Date(today);
  future.setDate(future.getDate() + days);
  const due = new Date(dueDateStr + "T00:00:00");
  return due >= today && due <= future;
}

export function getLoanStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: "Activo",
    paid: "Pagado",
    overdue: "Vencido",
    cancelled: "Cancelado",
  };
  return labels[status] ?? status;
}

export function getFrequencyLabel(freq: string): string {
  const labels: Record<string, string> = {
    weekly: "Semanal",
    biweekly: "Quincenal",
    monthly: "Mensual",
  };
  return labels[freq] ?? freq;
}

export function getInterestTypeLabel(type: string): string {
  return type === "simple" ? "Interés Simple" : "Interés Compuesto";
}

export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: "Efectivo",
    transfer: "Transferencia",
    check: "Cheque",
    other: "Otro",
  };
  return labels[method] ?? method;
}
