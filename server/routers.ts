import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getBorrowers,
  getBorrowerById,
  createBorrower,
  updateBorrower,
  deleteBorrower,
  getLoans,
  getLoanById,
  createLoan,
  updateLoan,
  getAmortizationSchedule,
  createAmortizationSchedule,
  deleteAmortizationSchedule,
  deleteLoan,
  markScheduleRowPaid,
  markScheduleRowUnpaid,
  getPayments,
  createPayment,
  deletePayment,
  getDashboardStats,
  getOverdueScheduleItems,
  getUpcomingScheduleItems,
} from "./db";
import { generateAmortizationSchedule } from "./amortization";
import { TRPCError } from "@trpc/server";

// ─── Borrowers Router ─────────────────────────────────────────────────────────
const borrowersRouter = router({
  list: protectedProcedure.query(({ ctx }) => getBorrowers(ctx.user.id)),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const b = await getBorrowerById(input.id, ctx.user.id);
      if (!b) throw new TRPCError({ code: "NOT_FOUND" });
      return b;
    }),

  create: protectedProcedure
    .input(z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      address: z.string().optional(),
      idNumber: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await createBorrower({ ...input, userId: ctx.user.id });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      address: z.string().optional(),
      idNumber: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await updateBorrower(id, ctx.user.id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteBorrower(input.id, ctx.user.id);
      return { success: true };
    }),
});

// ─── Loans Router ─────────────────────────────────────────────────────────────
const loansRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["active", "paid", "overdue", "cancelled"]).optional(),
      borrowerId: z.number().optional(),
    }).optional().default({}))
    .query(({ ctx, input }) => getLoans(ctx.user.id, input)),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const loan = await getLoanById(input.id, ctx.user.id);
      if (!loan) throw new TRPCError({ code: "NOT_FOUND" });
      return loan;
    }),

  create: protectedProcedure
    .input(z.object({
      borrowerId: z.number(),
      amount: z.number().positive(),
      interestRate: z.number().min(0),
      interestType: z.enum(["simple", "compound"]),
      paymentFrequency: z.enum(["weekly", "biweekly", "monthly"]),
      termPeriods: z.number().int().positive(),
      startDate: z.string(), // YYYY-MM-DD
      insuranceAmount: z.number().min(0).optional().default(0), // Seguro fijo por cuota
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const insurance = input.insuranceAmount ?? 0;
        // 1. Crear el préstamo
        const result = await createLoan({
        userId: ctx.user.id,
        borrowerId: input.borrowerId,
        amount: input.amount.toString(),
        interestRate: input.interestRate.toString(),
        interestType: input.interestType,
        paymentFrequency: input.paymentFrequency,
        termPeriods: input.termPeriods,
        startDate: input.startDate,
        status: "active",
        insuranceAmount: insurance.toString(),
        notes: input.notes,
        disbursedAt: new Date(),
      } as any);

      const loanId = (result as any).insertId as number;

      // 2. Generar tabla de amortización
      const schedule = generateAmortizationSchedule({
        amount: input.amount,
        interestRate: input.interestRate,
        interestType: input.interestType,
        paymentFrequency: input.paymentFrequency,
        termPeriods: input.termPeriods,
        startDate: input.startDate,
        insuranceAmount: insurance,
      });

      const rows = schedule.map((row) => ({
        loanId,
        periodNumber: row.periodNumber,
        dueDate: new Date(row.dueDate + "T00:00:00Z"),
        principalAmount: row.principalAmount.toString(),
        interestAmount: row.interestAmount.toString(),
        insuranceAmount: row.insuranceAmount.toString(),
        totalPayment: row.totalPayment.toString(),
        remainingBalance: row.remainingBalance.toString(),
        isPaid: false,
      }));

      console.log("[loans.create] Inserting", rows.length, "schedule rows for loan", loanId);
      await createAmortizationSchedule(rows as any);
      console.log("[loans.create] Successfully created loan", loanId);
      return { success: true, loanId };
      } catch (error) {
        console.error("[loans.create] Error:", error);
        throw error;
      }
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["active", "paid", "overdue", "cancelled"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await updateLoan(input.id, ctx.user.id, { status: input.status });
      return { success: true };
    }),

  getSchedule: protectedProcedure
    .input(z.object({ loanId: z.number() }))
    .query(({ input }) => getAmortizationSchedule(input.loanId)),

  markPaid: protectedProcedure
    .input(z.object({ scheduleId: z.number() }))
    .mutation(async ({ input }) => {
      await markScheduleRowPaid(input.scheduleId);
      return { success: true };
    }),

  markUnpaid: protectedProcedure
    .input(z.object({ scheduleId: z.number() }))
    .mutation(async ({ input }) => {
      await markScheduleRowUnpaid(input.scheduleId);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteLoan(input.id, ctx.user.id);
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      interestRate: z.number().min(0).optional(),
      insuranceAmount: z.number().min(0).optional(),
      termPeriods: z.number().int().positive().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...updates } = input;
        
        // Actualizar el prestamo
        const updateSet: Record<string, any> = {};
        if (updates.interestRate !== undefined) updateSet.interestRate = updates.interestRate.toString();
        if (updates.insuranceAmount !== undefined) updateSet.insuranceAmount = updates.insuranceAmount.toString();
        if (updates.termPeriods !== undefined) updateSet.termPeriods = updates.termPeriods;
        if (updates.notes !== undefined) updateSet.notes = updates.notes;
        updateSet.updatedAt = new Date();

        await updateLoan(id, ctx.user.id, updateSet);

        // Si se cambio la tasa de interes, seguro o plazo, regenerar tabla de amortizacion
        if (updates.interestRate !== undefined || updates.insuranceAmount !== undefined || updates.termPeriods !== undefined) {
          // Obtener el prestamo actualizado
          const loan = await getLoanById(id, ctx.user.id);
          if (!loan) throw new TRPCError({ code: "NOT_FOUND" });

          // Eliminar tabla de amortizacion anterior
          await deleteAmortizationSchedule(id);

          // Generar nueva tabla de amortizacion
          const newTermPeriods = updates.termPeriods ?? loan.termPeriods;
          const newInterestRate = updates.interestRate ?? parseFloat(loan.interestRate);
          const newInsuranceAmount = updates.insuranceAmount ?? parseFloat(loan.insuranceAmount || "0");

          const schedule = generateAmortizationSchedule({
            amount: parseFloat(loan.amount),
            interestRate: newInterestRate,
            interestType: loan.interestType as "simple" | "compound",
            paymentFrequency: loan.paymentFrequency as "weekly" | "biweekly" | "monthly",
            termPeriods: newTermPeriods,
            startDate: loan.startDate instanceof Date ? loan.startDate.toISOString().split('T')[0] : loan.startDate,
            insuranceAmount: newInsuranceAmount,
          });

          const rows = schedule.map((row) => ({
            loanId: id,
            periodNumber: row.periodNumber,
            dueDate: new Date(row.dueDate + "T00:00:00Z"),
            principalAmount: row.principalAmount.toString(),
            interestAmount: row.interestAmount.toString(),
            insuranceAmount: row.insuranceAmount.toString(),
            totalPayment: row.totalPayment.toString(),
            remainingBalance: row.remainingBalance.toString(),
            isPaid: false,
          }));

          await createAmortizationSchedule(rows as any);
        }

        return { success: true };
      } catch (error) {
        console.error("[loans.update] Error:", error);
        throw error;
      }
    }),
});

// ─── Payments Router ──────────────────────────────────────────────────────────
const paymentsRouter = router({
  list: protectedProcedure
    .input(z.object({
      loanId: z.number().optional(),
      borrowerId: z.number().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }).optional().default({}))
    .query(({ ctx, input }) => getPayments(ctx.user.id, input)),

  create: protectedProcedure
    .input(z.object({
      loanId: z.number(),
      borrowerId: z.number(),
      scheduleId: z.number().optional(),
      amount: z.number().positive(),
      paymentDate: z.string(),
      paymentMethod: z.enum(["cash", "transfer", "check", "other"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await createPayment({
        ...input,
        userId: ctx.user.id,
        amount: input.amount.toString(),
      } as any);
      // Si viene con scheduleId, marcar la cuota como pagada
      if (input.scheduleId) {
        await markScheduleRowPaid(input.scheduleId);
      }
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deletePayment(input.id, ctx.user.id);
      return { success: true };
    }),
});

// ─── Dashboard Router ─────────────────────────────────────────────────────────
const dashboardRouter = router({
  stats: protectedProcedure.query(({ ctx }) => getDashboardStats(ctx.user.id)),
  overdueItems: protectedProcedure.query(({ ctx }) => getOverdueScheduleItems(ctx.user.id)),
  upcomingItems: protectedProcedure.query(({ ctx }) => getUpcomingScheduleItems(ctx.user.id)),
});

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  borrowers: borrowersRouter,
  loans: loansRouter,
  payments: paymentsRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
