/**
 * Lógica de cálculo de amortización para préstamos personales.
 * Soporta interés simple e interés compuesto con frecuencias
 * semanal, quincenal y mensual.
 */

export type PaymentFrequency = "weekly" | "biweekly" | "monthly";
export type InterestType = "simple" | "compound";

export interface AmortizationRow {
  periodNumber: number;
  dueDate: string; // YYYY-MM-DD
  principalAmount: number;
  interestAmount: number;
  totalPayment: number;
  remainingBalance: number;
}

/**
 * Calcula los días entre períodos según la frecuencia de pago.
 */
function getDaysPerPeriod(frequency: PaymentFrequency): number {
  switch (frequency) {
    case "weekly":   return 7;
    case "biweekly": return 14;
    case "monthly":  return 30; // aproximación estándar
  }
}

/**
 * Suma días a una fecha base (formato YYYY-MM-DD) y devuelve YYYY-MM-DD.
 */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * Suma meses a una fecha base (formato YYYY-MM-DD) y devuelve YYYY-MM-DD.
 */
function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().split("T")[0];
}

/**
 * Calcula la fecha de vencimiento de un período dado.
 */
function getDueDate(startDate: string, periodNumber: number, frequency: PaymentFrequency): string {
  if (frequency === "monthly") {
    return addMonths(startDate, periodNumber);
  }
  const days = getDaysPerPeriod(frequency) * periodNumber;
  return addDays(startDate, days);
}

/**
 * Genera la tabla de amortización para interés SIMPLE.
 *
 * En interés simple, el interés de cada período se calcula siempre
 * sobre el capital original (no sobre el saldo pendiente).
 *
 * Cuota = (Capital / N) + (Capital × tasa)
 */
function generateSimpleAmortization(
  amount: number,
  ratePerPeriod: number,
  termPeriods: number,
  startDate: string,
  frequency: PaymentFrequency
): AmortizationRow[] {
  const rows: AmortizationRow[] = [];
  const principalPerPeriod = amount / termPeriods;
  const interestPerPeriod = amount * (ratePerPeriod / 100);
  const totalPerPeriod = principalPerPeriod + interestPerPeriod;

  let remainingBalance = amount;

  for (let i = 1; i <= termPeriods; i++) {
    const principal = i < termPeriods ? principalPerPeriod : remainingBalance;
    const interest = interestPerPeriod;
    const total = principal + interest;
    remainingBalance = Math.max(0, remainingBalance - principal);

    rows.push({
      periodNumber: i,
      dueDate: getDueDate(startDate, i, frequency),
      principalAmount: round2(principal),
      interestAmount: round2(interest),
      totalPayment: round2(total),
      remainingBalance: round2(remainingBalance),
    });
  }
  return rows;
}

/**
 * Genera la tabla de amortización para interés COMPUESTO (sistema francés).
 *
 * La cuota fija se calcula con la fórmula de anualidad:
 * PMT = P × [r(1+r)^n] / [(1+r)^n - 1]
 *
 * Donde r = tasa por período / 100, n = número de períodos.
 */
function generateCompoundAmortization(
  amount: number,
  ratePerPeriod: number,
  termPeriods: number,
  startDate: string,
  frequency: PaymentFrequency
): AmortizationRow[] {
  const rows: AmortizationRow[] = [];
  const r = ratePerPeriod / 100;

  let pmt: number;
  if (r === 0) {
    pmt = amount / termPeriods;
  } else {
    pmt = (amount * r * Math.pow(1 + r, termPeriods)) / (Math.pow(1 + r, termPeriods) - 1);
  }

  let remainingBalance = amount;

  for (let i = 1; i <= termPeriods; i++) {
    const interest = remainingBalance * r;
    let principal = pmt - interest;
    if (i === termPeriods) {
      principal = remainingBalance; // ajuste final para evitar centavos
    }
    remainingBalance = Math.max(0, remainingBalance - principal);

    rows.push({
      periodNumber: i,
      dueDate: getDueDate(startDate, i, frequency),
      principalAmount: round2(principal),
      interestAmount: round2(interest),
      totalPayment: round2(principal + interest),
      remainingBalance: round2(remainingBalance),
    });
  }
  return rows;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Punto de entrada principal para generar la tabla de amortización.
 */
export function generateAmortizationSchedule(params: {
  amount: number;
  interestRate: number;       // tasa por período en %
  interestType: InterestType;
  paymentFrequency: PaymentFrequency;
  termPeriods: number;
  startDate: string;          // YYYY-MM-DD
}): AmortizationRow[] {
  const { amount, interestRate, interestType, paymentFrequency, termPeriods, startDate } = params;

  if (interestType === "simple") {
    return generateSimpleAmortization(amount, interestRate, termPeriods, startDate, paymentFrequency);
  }
  return generateCompoundAmortization(amount, interestRate, termPeriods, startDate, paymentFrequency);
}
