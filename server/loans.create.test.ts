import { describe, it, expect } from "vitest";
import { generateAmortizationSchedule } from "./amortization";

describe("loans.create - Amortization schedule generation", () => {
  it("generates correct amortization schedule for simple interest", () => {
    const schedule = generateAmortizationSchedule({
      amount: 50000,
      interestRate: 5,
      interestType: "simple",
      termPeriods: 12,
      startDate: "2026-03-13",
      paymentFrequency: "monthly",
      insuranceAmount: 0,
    });

    expect(schedule).toHaveLength(12);
    expect(schedule[0].periodNumber).toBe(1);
    expect(schedule[0].principalAmount).toBeGreaterThan(0);
    expect(schedule[0].interestAmount).toBeGreaterThan(0);
    expect(schedule[0].totalPayment).toBe(schedule[0].principalAmount + schedule[0].interestAmount);
    expect(schedule[0].dueDate).toBeDefined();
  });

  it("includes insurance amount in total payment", () => {
    const scheduleWithoutInsurance = generateAmortizationSchedule({
      amount: 50000,
      interestRate: 5,
      interestType: "simple",
      termPeriods: 12,
      startDate: "2026-03-13",
      paymentFrequency: "monthly",
      insuranceAmount: 0,
    });

    const scheduleWithInsurance = generateAmortizationSchedule({
      amount: 50000,
      interestRate: 5,
      interestType: "simple",
      termPeriods: 12,
      startDate: "2026-03-13",
      paymentFrequency: "monthly",
      insuranceAmount: 1000,
    });

    // With insurance, total payment should be higher
    expect(scheduleWithInsurance[0].totalPayment).toBe(
      scheduleWithoutInsurance[0].totalPayment + 1000
    );
    expect(scheduleWithInsurance[0].insuranceAmount).toBe(1000);
  });

  it("generates correct amortization schedule for compound interest", () => {
    const schedule = generateAmortizationSchedule({
      amount: 50000,
      interestRate: 5,
      interestType: "compound",
      termPeriods: 12,
      startDate: "2026-03-13",
      paymentFrequency: "monthly",
      insuranceAmount: 0,
    });

    expect(schedule).toHaveLength(12);
    // Compound interest should have fixed payment amount
    expect(schedule[0].totalPayment).toBe(schedule[1].totalPayment);
    // But principal and interest should vary
    expect(schedule[0].principalAmount).toBeLessThan(schedule[1].principalAmount);
    expect(schedule[0].interestAmount).toBeGreaterThan(schedule[1].interestAmount);
  });

  it("calculates remaining balance correctly", () => {
    const schedule = generateAmortizationSchedule({
      amount: 50000,
      interestRate: 5,
      interestType: "simple",
      termPeriods: 12,
      startDate: "2026-03-13",
      paymentFrequency: "monthly",
      insuranceAmount: 0,
    });

    // First payment reduces balance
    expect(schedule[0].remainingBalance).toBeLessThan(50000);
    // Last payment should have minimal remaining balance
    expect(schedule[11].remainingBalance).toBeLessThan(1);
  });

  it("generates correct dates for monthly frequency", () => {
    const schedule = generateAmortizationSchedule({
      amount: 50000,
      interestRate: 5,
      interestType: "simple",
      termPeriods: 3,
      startDate: "2026-03-13",
      paymentFrequency: "monthly",
      insuranceAmount: 0,
    });

    const date1 = new Date(schedule[0].dueDate);
    const date2 = new Date(schedule[1].dueDate);
    const date3 = new Date(schedule[2].dueDate);

    // Dates should be approximately one month apart
    expect(date2.getMonth()).toBe((date1.getMonth() + 1) % 12);
    expect(date3.getMonth()).toBe((date2.getMonth() + 1) % 12);
  });

  it("generates correct dates for biweekly frequency", () => {
    const schedule = generateAmortizationSchedule({
      amount: 50000,
      interestRate: 5,
      interestType: "simple",
      termPeriods: 3,
      startDate: "2026-03-13",
      paymentFrequency: "biweekly",
      insuranceAmount: 0,
    });

    const date1 = new Date(schedule[0].dueDate);
    const date2 = new Date(schedule[1].dueDate);

    // Dates should be 14 days apart
    const diffInDays = Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffInDays).toBe(14);
  });

  it("generates correct dates for weekly frequency", () => {
    const schedule = generateAmortizationSchedule({
      amount: 50000,
      interestRate: 5,
      interestType: "simple",
      termPeriods: 3,
      startDate: "2026-03-13",
      paymentFrequency: "weekly",
      insuranceAmount: 0,
    });

    const date1 = new Date(schedule[0].dueDate);
    const date2 = new Date(schedule[1].dueDate);

    // Dates should be 7 days apart
    const diffInDays = Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffInDays).toBe(7);
  });
});
