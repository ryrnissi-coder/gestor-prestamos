import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  date,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Borrowers (Clientes/Deudores) ────────────────────────────────────────────
export const borrowers = mysqlTable("borrowers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // owner (prestamista)
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 30 }),
  address: text("address"),
  idNumber: varchar("idNumber", { length: 50 }), // DUI, cédula, etc.
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Borrower = typeof borrowers.$inferSelect;
export type InsertBorrower = typeof borrowers.$inferInsert;

// ─── Loans (Préstamos) ────────────────────────────────────────────────────────
export const loans = mysqlTable("loans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  borrowerId: int("borrowerId").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),       // Capital prestado
  interestRate: decimal("interestRate", { precision: 8, scale: 4 }).notNull(), // Tasa por período (%)
  interestType: mysqlEnum("interestType", ["simple", "compound"]).notNull().default("simple"),
  paymentFrequency: mysqlEnum("paymentFrequency", ["weekly", "biweekly", "monthly"]).notNull().default("monthly"),
  termPeriods: int("termPeriods").notNull(),                               // Número de cuotas
  startDate: date("startDate").notNull(),
  status: mysqlEnum("status", ["active", "paid", "overdue", "cancelled"]).notNull().default("active"),
  insuranceAmount: decimal("insuranceAmount", { precision: 15, scale: 2 }).default("0.00").notNull(), // Seguro fijo por cuota
  notes: text("notes"),
  disbursedAt: timestamp("disbursedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Loan = typeof loans.$inferSelect;
export type InsertLoan = typeof loans.$inferInsert;

// ─── Amortization Schedule (Tabla de Amortización) ────────────────────────────
export const amortizationSchedule = mysqlTable("amortization_schedule", {
  id: int("id").autoincrement().primaryKey(),
  loanId: int("loanId").notNull(),
  periodNumber: int("periodNumber").notNull(),   // Número de cuota
  dueDate: date("dueDate").notNull(),            // Fecha de vencimiento
  principalAmount: decimal("principalAmount", { precision: 15, scale: 2 }).notNull(), // Capital de la cuota
  interestAmount: decimal("interestAmount", { precision: 15, scale: 2 }).notNull(),   // Interés de la cuota
  totalPayment: decimal("totalPayment", { precision: 15, scale: 2 }).notNull(),       // Cuota total
  remainingBalance: decimal("remainingBalance", { precision: 15, scale: 2 }).notNull(), // Saldo pendiente
  insuranceAmount: decimal("insuranceAmount", { precision: 15, scale: 2 }).default("0.00").notNull(), // Seguro fijo por cuota
  isPaid: boolean("isPaid").default(false).notNull(),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AmortizationScheduleRow = typeof amortizationSchedule.$inferSelect;
export type InsertAmortizationScheduleRow = typeof amortizationSchedule.$inferInsert;

// ─── Payments (Pagos) ─────────────────────────────────────────────────────────
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  loanId: int("loanId").notNull(),
  borrowerId: int("borrowerId").notNull(),
  userId: int("userId").notNull(),
  scheduleId: int("scheduleId"),               // Cuota a la que aplica (opcional)
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentDate: date("paymentDate").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "transfer", "check", "other"]).notNull().default("cash"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
