import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  borrowers,
  InsertBorrower,
  loans,
  InsertLoan,
  amortizationSchedule,
  InsertAmortizationScheduleRow,
  payments,
  InsertPayment,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Borrowers ────────────────────────────────────────────────────────────────
export async function getBorrowers(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(borrowers).where(eq(borrowers.userId, userId)).orderBy(desc(borrowers.createdAt));
}

export async function getBorrowerById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(borrowers).where(and(eq(borrowers.id, id), eq(borrowers.userId, userId))).limit(1);
  return result[0];
}

export async function createBorrower(data: InsertBorrower) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(borrowers).values(data);
  return result;
}

export async function updateBorrower(id: number, userId: number, data: Partial<InsertBorrower>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(borrowers).set(data).where(and(eq(borrowers.id, id), eq(borrowers.userId, userId)));
}

export async function deleteBorrower(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.delete(borrowers).where(and(eq(borrowers.id, id), eq(borrowers.userId, userId)));
}

// ─── Loans ────────────────────────────────────────────────────────────────────
export async function getLoans(userId: number, filters?: { status?: string; borrowerId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(loans.userId, userId)];
  if (filters?.status) conditions.push(eq(loans.status, filters.status as any));
  if (filters?.borrowerId) conditions.push(eq(loans.borrowerId, filters.borrowerId));
  return db.select().from(loans).where(and(...conditions)).orderBy(desc(loans.createdAt));
}

export async function getLoanById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(loans).where(and(eq(loans.id, id), eq(loans.userId, userId))).limit(1);
  return result[0];
}

export async function createLoan(data: InsertLoan) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(loans).values(data);
  return result;
}

export async function updateLoan(id: number, userId: number, data: Partial<InsertLoan>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(loans).set(data).where(and(eq(loans.id, id), eq(loans.userId, userId)));
}

// ─── Amortization Schedule ────────────────────────────────────────────────────
export async function getAmortizationSchedule(loanId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(amortizationSchedule).where(eq(amortizationSchedule.loanId, loanId)).orderBy(amortizationSchedule.periodNumber);
}

export async function createAmortizationSchedule(rows: InsertAmortizationScheduleRow[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (rows.length === 0) return;
  return db.insert(amortizationSchedule).values(rows);
}

export async function deleteAmortizationSchedule(loanId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.delete(amortizationSchedule).where(eq(amortizationSchedule.loanId, loanId));
}

export async function markScheduleRowPaid(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(amortizationSchedule).set({ isPaid: true, paidAt: new Date() }).where(eq(amortizationSchedule.id, id));
}

export async function markScheduleRowUnpaid(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(amortizationSchedule).set({ isPaid: false, paidAt: null }).where(eq(amortizationSchedule.id, id));
}

// ─── Payments ─────────────────────────────────────────────────────────────────
export async function getPayments(userId: number, filters?: { loanId?: number; borrowerId?: number; from?: string; to?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(payments.userId, userId)];
  if (filters?.loanId) conditions.push(eq(payments.loanId, filters.loanId));
  if (filters?.borrowerId) conditions.push(eq(payments.borrowerId, filters.borrowerId));
  if (filters?.from) conditions.push(sql`${payments.paymentDate} >= ${filters.from}`);
  if (filters?.to) conditions.push(sql`${payments.paymentDate} <= ${filters.to}`);
  return db.select().from(payments).where(and(...conditions)).orderBy(desc(payments.paymentDate));
}

export async function createPayment(data: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(payments).values(data);
  return result;
}

export async function deletePayment(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.delete(payments).where(and(eq(payments.id, id), eq(payments.userId, userId)));
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export async function getDashboardStats(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const today = new Date().toISOString().split("T")[0];
  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [allLoans, allPayments, overdueSchedule, upcomingSchedule] = await Promise.all([
    db.select().from(loans).where(eq(loans.userId, userId)),
    db.select().from(payments).where(eq(payments.userId, userId)),
    db.select().from(amortizationSchedule)
      .innerJoin(loans, eq(amortizationSchedule.loanId, loans.id))
      .where(and(
        eq(loans.userId, userId),
        eq(amortizationSchedule.isPaid, false),
      sql`${amortizationSchedule.dueDate} < ${today}`,
    )),
    db.select().from(amortizationSchedule)
      .innerJoin(loans, eq(amortizationSchedule.loanId, loans.id))
      .where(and(
        eq(loans.userId, userId),
        eq(amortizationSchedule.isPaid, false),
        sql`${amortizationSchedule.dueDate} >= ${today}`,
        sql`${amortizationSchedule.dueDate} <= ${sevenDaysLater}`,
      )),
  ]);

  const activeLoans = allLoans.filter((l) => l.status === "active");
  const overdueLoans = allLoans.filter((l) => l.status === "overdue");
  const paidLoans = allLoans.filter((l) => l.status === "paid");

  const totalDisbursed = allLoans.reduce((s, l) => s + parseFloat(l.amount as string), 0);
  const totalCollected = allPayments.reduce((s, p) => s + parseFloat(p.amount as string), 0);

  const pendingAmount = overdueSchedule.reduce(
    (s, r) => s + parseFloat((r.amortization_schedule as any).totalPayment as string),
    0
  );
  const upcomingAmount = upcomingSchedule.reduce(
    (s, r) => s + parseFloat((r.amortization_schedule as any).totalPayment as string),
    0
  );

  return {
    totalLoans: allLoans.length,
    activeLoans: activeLoans.length,
    overdueLoans: overdueLoans.length,
    paidLoans: paidLoans.length,
    totalDisbursed,
    totalCollected,
    overdueCount: overdueSchedule.length,
    overdueAmount: pendingAmount,
    upcomingCount: upcomingSchedule.length,
    upcomingAmount,
  };
}

export async function getOverdueScheduleItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const today = new Date().toISOString().split("T")[0];
  return db.select({
    scheduleId: amortizationSchedule.id,
    loanId: amortizationSchedule.loanId,
    periodNumber: amortizationSchedule.periodNumber,
    dueDate: amortizationSchedule.dueDate,
    totalPayment: amortizationSchedule.totalPayment,
    borrowerId: loans.borrowerId,
  })
    .from(amortizationSchedule)
    .innerJoin(loans, eq(amortizationSchedule.loanId, loans.id))
    .where(and(
      eq(loans.userId, userId),
      eq(amortizationSchedule.isPaid, false),
      sql`${amortizationSchedule.dueDate} < ${today}`,
    ))
    .orderBy(amortizationSchedule.dueDate)
    .limit(20);
}

export async function getUpcomingScheduleItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const today = new Date().toISOString().split("T")[0];
  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  return db.select({
    scheduleId: amortizationSchedule.id,
    loanId: amortizationSchedule.loanId,
    periodNumber: amortizationSchedule.periodNumber,
    dueDate: amortizationSchedule.dueDate,
    totalPayment: amortizationSchedule.totalPayment,
    borrowerId: loans.borrowerId,
  })
    .from(amortizationSchedule)
    .innerJoin(loans, eq(amortizationSchedule.loanId, loans.id))
    .where(and(
      eq(loans.userId, userId),
      eq(amortizationSchedule.isPaid, false),
      sql`${amortizationSchedule.dueDate} >= ${today}`,
      sql`${amortizationSchedule.dueDate} <= ${sevenDaysLater}`,
    ))
    .orderBy(amortizationSchedule.dueDate)
    .limit(20);
}
