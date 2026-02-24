import { describe, expect, it } from "vitest";
import { generateAmortizationSchedule } from "./amortization";

describe("generateAmortizationSchedule - interés simple", () => {
  it("genera la cantidad correcta de cuotas", () => {
    const schedule = generateAmortizationSchedule({
      amount: 1000,
      interestRate: 5,
      interestType: "simple",
      termPeriods: 4,
      startDate: "2024-01-01",
      paymentFrequency: "monthly",
    });
    expect(schedule).toHaveLength(4);
  });

  it("la suma de capital iguala el monto prestado", () => {
    const schedule = generateAmortizationSchedule({
      amount: 1200,
      interestRate: 3,
      interestType: "simple",
      termPeriods: 6,
      startDate: "2024-01-01",
      paymentFrequency: "monthly",
    });
    const totalPrincipal = schedule.reduce((s, r) => s + r.principalAmount, 0);
    expect(Math.abs(totalPrincipal - 1200)).toBeLessThan(0.02);
  });

  it("el saldo final es cero", () => {
    const schedule = generateAmortizationSchedule({
      amount: 500,
      interestRate: 2,
      interestType: "simple",
      termPeriods: 5,
      startDate: "2024-01-01",
      paymentFrequency: "monthly",
    });
    const lastRow = schedule[schedule.length - 1];
    expect(Math.abs(lastRow.remainingBalance)).toBeLessThan(0.02);
  });
});

describe("generateAmortizationSchedule - interés compuesto", () => {
  it("genera la cantidad correcta de cuotas", () => {
    const schedule = generateAmortizationSchedule({
      amount: 2000,
      interestRate: 2,
      interestType: "compound",
      termPeriods: 12,
      startDate: "2024-01-01",
      paymentFrequency: "monthly",
    });
    expect(schedule).toHaveLength(12);
  });

  it("el saldo final es cero", () => {
    const schedule = generateAmortizationSchedule({
      amount: 1000,
      interestRate: 1.5,
      interestType: "compound",
      termPeriods: 6,
      startDate: "2024-01-01",
      paymentFrequency: "monthly",
    });
    const lastRow = schedule[schedule.length - 1];
    expect(Math.abs(lastRow.remainingBalance)).toBeLessThan(0.05);
  });

  it("todas las cuotas son iguales (amortización francesa)", () => {
    const schedule = generateAmortizationSchedule({
      amount: 1000,
      interestRate: 2,
      interestType: "compound",
      termPeriods: 4,
      startDate: "2024-01-01",
      paymentFrequency: "monthly",
    });
    const firstPayment = schedule[0].totalPayment;
    schedule.forEach((row, i) => {
      if (i < schedule.length - 1) {
        expect(Math.abs(row.totalPayment - firstPayment)).toBeLessThan(0.02);
      }
    });
  });
});

describe("generateAmortizationSchedule - fechas", () => {
  it("calcula fechas mensuales correctamente", () => {
    const schedule = generateAmortizationSchedule({
      amount: 1000,
      interestRate: 5,
      interestType: "simple",
      termPeriods: 3,
      startDate: "2024-01-15",
      paymentFrequency: "monthly",
    });
    expect(schedule[0].dueDate).toBe("2024-02-15");
    expect(schedule[1].dueDate).toBe("2024-03-15");
    expect(schedule[2].dueDate).toBe("2024-04-15");
  });

  it("calcula fechas quincenales correctamente", () => {
    const schedule = generateAmortizationSchedule({
      amount: 1000,
      interestRate: 2,
      interestType: "simple",
      termPeriods: 2,
      startDate: "2024-01-01",
      paymentFrequency: "biweekly",
    });
    expect(schedule[0].dueDate).toBe("2024-01-15");
    expect(schedule[1].dueDate).toBe("2024-01-29");
  });

  it("calcula fechas semanales correctamente", () => {
    const schedule = generateAmortizationSchedule({
      amount: 500,
      interestRate: 1,
      interestType: "simple",
      termPeriods: 3,
      startDate: "2024-01-01",
      paymentFrequency: "weekly",
    });
    expect(schedule[0].dueDate).toBe("2024-01-08");
    expect(schedule[1].dueDate).toBe("2024-01-15");
    expect(schedule[2].dueDate).toBe("2024-01-22");
  });
});
