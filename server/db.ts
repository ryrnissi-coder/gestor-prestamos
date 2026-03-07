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
  clientInvitations,
  InsertClientInvitation,
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

export async function deleteLoan(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Delete related records first
  await db.delete(amortizationSchedule).where(eq(amortizationSchedule.loanId, id));
  await db.delete(payments).where(eq(payments.loanId, id));
  return db.delete(loans).where(and(eq(loans.id, id), eq(loans.userId, userId)));
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
  // Insert in batches of 10 to avoid MySQL max parameter limits
  const BATCH_SIZE = 10;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db.insert(amortizationSchedule).values(batch);
  }
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

  // Run queries independently so one failure doesn't break the whole dashboard
  const allLoans = await db.select().from(loans).where(eq(loans.userId, userId)).catch(() => []);
  const allPayments = await db.select().from(payments).where(eq(payments.userId, userId)).catch(() => []);

  const overdueSchedule = await db.select({
    scheduleId: amortizationSchedule.id,
    totalPayment: amortizationSchedule.totalPayment,
  })
    .from(amortizationSchedule)
    .innerJoin(loans, eq(amortizationSchedule.loanId, loans.id))
    .where(and(
      eq(loans.userId, userId),
      eq(amortizationSchedule.isPaid, false),
      sql`DATE(${amortizationSchedule.dueDate}) < ${today}`,
    ))
    .catch(() => []);

  const upcomingSchedule = await db.select({
    scheduleId: amortizationSchedule.id,
    totalPayment: amortizationSchedule.totalPayment,
  })
    .from(amortizationSchedule)
    .innerJoin(loans, eq(amortizationSchedule.loanId, loans.id))
    .where(and(
      eq(loans.userId, userId),
      eq(amortizationSchedule.isPaid, false),
      sql`DATE(${amortizationSchedule.dueDate}) >= ${today}`,
      sql`DATE(${amortizationSchedule.dueDate}) <= ${sevenDaysLater}`,
    ))
    .catch(() => []);

  const activeLoans = allLoans.filter((l) => l.status === "active");
  const overdueLoans = allLoans.filter((l) => l.status === "overdue");
  const paidLoans = allLoans.filter((l) => l.status === "paid");

  const totalDisbursed = allLoans.reduce((s, l) => s + parseFloat(String(l.amount) || "0"), 0);
  const totalCollected = allPayments.reduce((s, p) => s + parseFloat(String(p.amount) || "0"), 0);

  const pendingAmount = overdueSchedule.reduce(
    (s, r) => s + parseFloat(String(r.totalPayment) || "0"),
    0
  );
  const upcomingAmount = upcomingSchedule.reduce(
    (s, r) => s + parseFloat(String(r.totalPayment) || "0"),
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
    paymentFrequency: loans.paymentFrequency,
    borrowerFirstName: borrowers.firstName,
    borrowerLastName: borrowers.lastName,
    borrowerPhone: borrowers.phone,
  })
    .from(amortizationSchedule)
    .innerJoin(loans, eq(amortizationSchedule.loanId, loans.id))
    .innerJoin(borrowers, eq(loans.borrowerId, borrowers.id))
    .where(and(
      eq(loans.userId, userId),
      eq(amortizationSchedule.isPaid, false),
      sql`DATE(${amortizationSchedule.dueDate}) < ${today}`,
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
    paymentFrequency: loans.paymentFrequency,
    borrowerFirstName: borrowers.firstName,
    borrowerLastName: borrowers.lastName,
    borrowerPhone: borrowers.phone,
  })
    .from(amortizationSchedule)
    .innerJoin(loans, eq(amortizationSchedule.loanId, loans.id))
    .innerJoin(borrowers, eq(loans.borrowerId, borrowers.id))
    .where(and(
      eq(loans.userId, userId),
      eq(amortizationSchedule.isPaid, false),
      sql`DATE(${amortizationSchedule.dueDate}) >= ${today}`,
      sql`DATE(${amortizationSchedule.dueDate}) <= ${sevenDaysLater}`,
    ))
    .orderBy(amortizationSchedule.dueDate)
    .limit(20);
}



// ─── Create Client User ────────────────────────────────────────────────────────
export async function createClientUser(
  borrowerId: number,
  email: string,
  name: string
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(users).values({
    openId: `client_${borrowerId}_${Date.now()}`,
    name,
    email,
    role: "client",
    borrowerId,
    loginMethod: "email",
    lastSignedIn: new Date(),
  });

  return result[0].insertId || 0;
}

// ─── Get Client's Loan ────────────────────────────────────────────────────────
export async function getClientLoan(borrowerId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(loans).where(eq(loans.borrowerId, borrowerId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// ─── Get Client's Amortization Schedule ────────────────────────────────────────
export async function getClientSchedule(loanId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(amortizationSchedule).where(eq(amortizationSchedule.loanId, loanId));
}

// ─── Get Client's Payments ────────────────────────────────────────────────────
export async function getClientPayments(loanId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(payments).where(eq(payments.loanId, loanId)).orderBy(payments.paymentDate);
}

// ─── Update Client Profile ────────────────────────────────────────────────────
export async function updateClientProfile(
  borrowerId: number,
  updates: {
    phone?: string;
    email?: string;
    address?: string;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateSet: Record<string, unknown> = {};
  if (updates.phone !== undefined) updateSet.phone = updates.phone;
  if (updates.email !== undefined) updateSet.email = updates.email;
  if (updates.address !== undefined) updateSet.address = updates.address;
  updateSet.updatedAt = new Date();

  if (Object.keys(updateSet).length === 0) return;

  await db.update(borrowers).set(updateSet).where(eq(borrowers.id, borrowerId));
}


// ─── Client Invitations ────────────────────────────────────────────────────────
export async function createClientInvitation(data: InsertClientInvitation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(clientInvitations).values(data);
  return result;
}

export async function getInvitationByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(clientInvitations).where(eq(clientInvitations.invitationToken, token));
  return result.length > 0 ? result[0] : null;
}

export async function acceptInvitation(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(clientInvitations)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(eq(clientInvitations.invitationToken, token));
}

export async function getClientInvitations(borrowerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(clientInvitations).where(eq(clientInvitations.borrowerId, borrowerId));
}

export async function getBorrowerByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(borrowers).where(eq(borrowers.email, email));
  return result.length > 0 ? result[0] : null;
}
