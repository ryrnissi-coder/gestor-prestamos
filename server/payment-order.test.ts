import { describe, it, expect } from "vitest";

describe("Payment Order Validation Logic", () => {
  // Mock schedule data
  const mockSchedule = [
    { id: 1, periodNumber: 1, isPaid: false },
    { id: 2, periodNumber: 2, isPaid: false },
    { id: 3, periodNumber: 3, isPaid: false },
    { id: 4, periodNumber: 4, isPaid: false },
  ];

  it("should allow paying the first installment", () => {
    const currentSchedule = mockSchedule[0];
    const unpaidBefore = mockSchedule.filter(
      s => s.periodNumber < currentSchedule.periodNumber && !s.isPaid
    );
    
    expect(unpaidBefore.length).toBe(0);
  });

  it("should detect unpaid installments before paying out of order", () => {
    // Mark first as paid
    mockSchedule[0].isPaid = true;
    
    const currentSchedule = mockSchedule[2]; // Try to pay 3rd
    const unpaidBefore = mockSchedule.filter(
      s => s.periodNumber < currentSchedule.periodNumber && !s.isPaid
    );
    
    // Should detect that 2nd is unpaid
    expect(unpaidBefore.length).toBe(1);
    expect(unpaidBefore[0].periodNumber).toBe(2);
  });

  it("should allow paying in order", () => {
    // Mark 1st and 2nd as paid
    mockSchedule[0].isPaid = true;
    mockSchedule[1].isPaid = true;
    
    const currentSchedule = mockSchedule[2]; // Try to pay 3rd
    const unpaidBefore = mockSchedule.filter(
      s => s.periodNumber < currentSchedule.periodNumber && !s.isPaid
    );
    
    // Should not detect any unpaid before
    expect(unpaidBefore.length).toBe(0);
  });
});
