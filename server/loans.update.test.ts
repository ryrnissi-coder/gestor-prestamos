import { describe, expect, it, beforeEach, vi } from "vitest";
import { generateAmortizationSchedule } from "./amortization";

describe("loans.update - Recalculation of amortization schedule", () => {
  it("regenerates schedule when interest rate changes", () => {
    // Original schedule with 5% interest
    const originalSchedule = generateAmortizationSchedule({
      amount: 1000,
      interestRate: 5,
      interestType: "simple",
      termPeriods: 4,
      startDate: "2024-01-01",
      paymentFrequency: "monthly",
    });

    // New schedule with 3% interest
    const newSchedule = generateAmortizationSchedule({
      amount: 1000,
      interestRate: 3,
      interestType: "simple",
      termPeriods: 4,
      startDate: "2024-01-01",
      paymentFrequency: "monthly",
    });

    // Interest amounts should be different
    expect(originalSchedule[0].interestAmount).toBeGreaterThan(
      newSchedule[0].interestAmount
    );
    expect(originalSchedule[0].totalPayment).toBeGreaterThan(
      newSchedule[0].totalPayment
    );
  });

  it("regenerates schedule when insurance amount changes", () => {
    // Original schedule without insurance
    const originalSchedule = generateAmortizationSchedule({
      amount: 1000,
      interestRate: 5,
      interestType: "simple",
      termPeriods: 4,
      startDate: "2024-01-01",
      paymentFrequency: "monthly",
      insuranceAmount: 0,
    });

    // New schedule with insurance
    const newSchedule = generateAmortizationSchedule({
      amount: 1000,
      interestRate: 5,
      interestType: "simple",
      termPeriods: 4,
      startDate: "2024-01-01",
      paymentFrequency: "monthly",
      insuranceAmount: 50,
    });

    // Total payment should increase by insurance amount
    expect(newSchedule[0].totalPayment).toBe(
      originalSchedule[0].totalPayment + 50
    );
    expect(newSchedule[0].insuranceAmount).toBe(50);
  });

  it("regenerates schedule when term periods change", () => {
    // Original schedule with 4 periods
    const originalSchedule = generateAmortizationSchedule({
      amount: 1000,
      interestRate: 5,
      interestType: "simple",
      termPeriods: 4,
      startDate: "2024-01-01",
      paymentFrequency: "monthly",
    });

    // New schedule with 6 periods
    const newSchedule = generateAmortizationSchedule({
      amount: 1000,
      interestRate: 5,
      interestType: "simple",
      termPeriods: 6,
      startDate: "2024-01-01",
      paymentFrequency: "monthly",
    });

    // Should have different number of periods
    expect(originalSchedule).toHaveLength(4);
    expect(newSchedule).toHaveLength(6);

    // Payments should be smaller with more periods
    expect(newSchedule[0].totalPayment).toBeLessThan(
      originalSchedule[0].totalPayment
    );
  });

  it("maintains correct amortization after interest rate change", () => {
    const newSchedule = generateAmortizationSchedule({
      amount: 1000,
      interestRate: 3,
      interestType: "simple",
      termPeriods: 4,
      startDate: "2024-01-01",
      paymentFrequency: "monthly",
    });

    // Principal sum should equal loan amount
    const totalPrincipal = newSchedule.reduce(
      (s, r) => s + r.principalAmount,
      0
    );
    expect(Math.abs(totalPrincipal - 1000)).toBeLessThan(0.02);

    // Final balance should be zero
    const lastRow = newSchedule[newSchedule.length - 1];
    expect(Math.abs(lastRow.remainingBalance)).toBeLessThan(0.02);
  });

  it("maintains correct amortization after term change", () => {
    const newSchedule = generateAmortizationSchedule({
      amount: 1000,
      interestRate: 5,
      interestType: "compound",
      termPeriods: 6,
      startDate: "2024-01-01",
      paymentFrequency: "monthly",
    });

    // Principal sum should equal loan amount
    const totalPrincipal = newSchedule.reduce(
      (s, r) => s + r.principalAmount,
      0
    );
    expect(Math.abs(totalPrincipal - 1000)).toBeLessThan(0.02);

    // Final balance should be zero
    const lastRow = newSchedule[newSchedule.length - 1];
    expect(Math.abs(lastRow.remainingBalance)).toBeLessThan(0.05);
  });

  it("handles multiple changes simultaneously", () => {
    const newSchedule = generateAmortizationSchedule({
      amount: 1000,
      interestRate: 2,
      interestType: "simple",
      termPeriods: 5,
      startDate: "2024-01-01",
      paymentFrequency: "monthly",
      insuranceAmount: 25,
    });

    // Should have 5 periods
    expect(newSchedule).toHaveLength(5);

    // Each payment should include insurance
    newSchedule.forEach((row) => {
      expect(row.insuranceAmount).toBe(25);
      expect(row.totalPayment).toBe(
        row.principalAmount + row.interestAmount + row.insuranceAmount
      );
    });

    // Final balance should be zero
    const lastRow = newSchedule[newSchedule.length - 1];
    expect(Math.abs(lastRow.remainingBalance)).toBeLessThan(0.02);
  });
});
