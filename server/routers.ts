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
  createClientInvitation,
  getInvitationByToken,
  acceptInvitation,
  createClientUser,
  getClientLoan,
  getClientSchedule,
  getClientPayments,
  getBorrowerByEmail,
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

      console.log("[loans.create] Insert result:", JSON.stringify(result));
      console.log("[loans.create] Result type:", typeof result, "Is array:", Array.isArray(result));
      
      let loanId: number | undefined;
      if (typeof result === 'object' && result !== null) {
        // Intenta diferentes formas de obtener insertId
        loanId = (result as any).insertId || (result as any)[0]?.insertId || (Array.isArray(result) ? result[0]?.insertId : undefined);
      }
      
      console.log("[loans.create] Extracted loanId:", loanId);
      if (!loanId || loanId === 0) {
        throw new Error(`Failed to get loanId from insert result: ${JSON.stringify(result)}`);
      }

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
        dueDate: typeof row.dueDate === 'string' ? new Date(row.dueDate) : row.dueDate,
        principalAmount: row.principalAmount.toString(),
        interestAmount: row.interestAmount.toString(),
        insuranceAmount: row.insuranceAmount.toString(),
        totalPayment: row.totalPayment.toString(),
        remainingBalance: row.remainingBalance.toString(),
        isPaid: false,
      }));

      console.log("[loans.create] Inserting", rows.length, "schedule rows for loan", loanId);
      console.log("[loans.create] First row:", JSON.stringify(rows[0], null, 2));
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
      amount: z.number().positive().optional(),
      interestRate: z.number().min(0).optional(),
      interestType: z.enum(["simple", "compound"]).optional(),
      paymentFrequency: z.enum(["weekly", "biweekly", "monthly"]).optional(),
      startDate: z.string().optional(),
      insuranceAmount: z.number().min(0).optional(),
      termPeriods: z.number().int().positive().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...updates } = input;
        
        // Actualizar el prestamo
        const updateSet: Record<string, any> = {};
        if (updates.amount !== undefined) updateSet.amount = updates.amount.toString();
        if (updates.interestRate !== undefined) updateSet.interestRate = updates.interestRate.toString();
        if (updates.interestType !== undefined) updateSet.interestType = updates.interestType;
        if (updates.paymentFrequency !== undefined) updateSet.paymentFrequency = updates.paymentFrequency;
        if (updates.startDate !== undefined) updateSet.startDate = new Date(updates.startDate);
        if (updates.insuranceAmount !== undefined) updateSet.insuranceAmount = updates.insuranceAmount.toString();
        if (updates.termPeriods !== undefined) updateSet.termPeriods = updates.termPeriods;
        if (updates.notes !== undefined) updateSet.notes = updates.notes;
        updateSet.updatedAt = new Date();

        await updateLoan(id, ctx.user.id, updateSet);

        // Si se cambio cualquier parámetro que afecte la amortización, regenerar tabla
        if (updates.amount !== undefined || updates.interestRate !== undefined || updates.interestType !== undefined || 
            updates.paymentFrequency !== undefined || updates.startDate !== undefined || 
            updates.insuranceAmount !== undefined || updates.termPeriods !== undefined) {
          // Obtener el prestamo actualizado
          const loan = await getLoanById(id, ctx.user.id);
          if (!loan) throw new TRPCError({ code: "NOT_FOUND" });

          // Eliminar tabla de amortizacion anterior
          await deleteAmortizationSchedule(id);

          // Generar nueva tabla de amortizacion
          const newAmount = updates.amount ?? parseFloat(loan.amount);
          const newTermPeriods = updates.termPeriods ?? loan.termPeriods;
          const newInterestRate = updates.interestRate ?? parseFloat(loan.interestRate);
          const newInterestType = updates.interestType ?? (loan.interestType as "simple" | "compound");
          const newPaymentFrequency = updates.paymentFrequency ?? (loan.paymentFrequency as "weekly" | "biweekly" | "monthly");
          const newStartDate = updates.startDate ?? (loan.startDate instanceof Date ? loan.startDate.toISOString().split('T')[0] : loan.startDate);
          const newInsuranceAmount = updates.insuranceAmount ?? parseFloat(loan.insuranceAmount || "0");

          const schedule = generateAmortizationSchedule({
            amount: newAmount,
            interestRate: newInterestRate,
            interestType: newInterestType,
            paymentFrequency: newPaymentFrequency,
            termPeriods: newTermPeriods,
            startDate: newStartDate,
            insuranceAmount: newInsuranceAmount,
          });

      const rows = schedule.map((row) => ({
        loanId: loan.id,
        periodNumber: row.periodNumber,
        dueDate: typeof row.dueDate === 'string' ? new Date(row.dueDate) : row.dueDate,
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
      // Si viene con scheduleId, validar que se puede pagar en orden
      if (input.scheduleId) {
        const schedule = await getAmortizationSchedule(input.loanId);
        const currentSchedule = schedule.find(s => s.id === input.scheduleId);
        
        if (!currentSchedule) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Schedule not found" });
        }
        
        // Validar que todas las cuotas anteriores estén pagadas
        const unpaidBefore = schedule.filter(
          s => s.periodNumber < currentSchedule.periodNumber && !s.isPaid
        );
        
        if (unpaidBefore.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `No se puede pagar la cuota ${currentSchedule.periodNumber}. Primero debe pagar las cuotas: ${unpaidBefore.map(s => s.periodNumber).join(", ")}`
          });
        }
      }
      
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

// ─── Invitations Router ──────────────────────────────────────────────────────
const invitationsRouter = router({
  create: protectedProcedure
    .input(z.object({
      borrowerId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify borrower belongs to current user
      const borrower = await getBorrowerById(input.borrowerId, ctx.user.id);
      if (!borrower) throw new TRPCError({ code: "NOT_FOUND", message: "Borrower not found" });

      // Generate unique token
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await createClientInvitation({
        borrowerId: input.borrowerId,
        email: borrower.email || "",
        invitationToken: token,
        status: "pending",
        expiresAt,
        createdBy: ctx.user.id,
      });

      // Return invitation link
      const invitationLink = `${process.env.VITE_FRONTEND_URL || "http://localhost:5173"}/register?token=${token}`;
      return { token, invitationLink, expiresAt };
    }),

  validate: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const invitation = await getInvitationByToken(input.token);
      if (!invitation) throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" });
      if (invitation.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation already used or expired" });
      if (new Date() > invitation.expiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation expired" });

      return { borrowerId: invitation.borrowerId, email: invitation.email };
    }),

  accept: publicProcedure
    .input(z.object({
      token: z.string(),
      password: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      const invitation = await getInvitationByToken(input.token);
      if (!invitation) throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" });
      if (invitation.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation already used" });
      if (new Date() > invitation.expiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation expired" });

      // Create client user
      const borrower = await getBorrowerById(invitation.borrowerId, 0); // We don't have userId yet
      if (!borrower) throw new TRPCError({ code: "NOT_FOUND", message: "Borrower not found" });

      const userId = await createClientUser(invitation.borrowerId, invitation.email, `${borrower.firstName} ${borrower.lastName}`);

      // Mark invitation as accepted
      await acceptInvitation(input.token);

      return { success: true, userId, borrowerId: invitation.borrowerId };
    }),
});

// ─── Client Router ────────────────────────────────────────────────────────────
const borrowerClientRouter = router({
  getLoan: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "client" || !ctx.user.borrowerId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not a client" });
    }
    const loan = await getClientLoan(ctx.user.borrowerId);
    if (!loan) throw new TRPCError({ code: "NOT_FOUND", message: "Loan not found" });
    return loan;
  }),

  getSchedule: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "client" || !ctx.user.borrowerId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not a client" });
    }
    const loan = await getClientLoan(ctx.user.borrowerId);
    if (!loan) throw new TRPCError({ code: "NOT_FOUND", message: "Loan not found" });
    return getClientSchedule(loan.id);
  }),

  getPayments: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "client" || !ctx.user.borrowerId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not a client" });
    }
    const loan = await getClientLoan(ctx.user.borrowerId);
    if (!loan) throw new TRPCError({ code: "NOT_FOUND", message: "Loan not found" });
    return getClientPayments(loan.id);
  }),
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
  invitations: invitationsRouter,
  borrowerClient: borrowerClientRouter,
});

export type AppRouter = typeof appRouter;
