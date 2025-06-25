import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  department: text("department"),
  role: text("role").notNull().default("employee"), // employee, approver, admin
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  employeeName: text("employee_name").notNull(),
  employeeEmail: text("employee_email").notNull(),
  department: text("department"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  expenseDate: timestamp("expense_date").notNull(),
  submissionDate: timestamp("submission_date").notNull().defaultNow(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  approvedBy: integer("approved_by"),
  approvedByName: text("approved_by_name"),
  approvalDate: timestamp("approval_date"),
  approvalNote: text("approval_note"),
  receiptUrl: text("receipt_url"),
  receiptFileName: text("receipt_file_name"),
  emailId: text("email_id"), // Gmail message ID if submitted via email
  formSubmissionId: text("form_submission_id"), // Google Form submission ID
  sheetsRowNumber: integer("sheets_row_number"), // Row number in Google Sheets
  notificationSent: boolean("notification_sent").notNull().default(false),
});

export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  submissionDate: true,
  approvedBy: true,
  approvedByName: true,
  approvalDate: true,
  notificationSent: true,
}).extend({
  amount: z.string().transform((val) => parseFloat(val)),
  expenseDate: z.string().transform((val) => new Date(val)),
});

export const updateExpenseStatusSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  approvalNote: z.string().optional(),
  approvedBy: z.number(),
  approvedByName: z.string(),
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type UpdateExpenseStatus = z.infer<typeof updateExpenseStatusSchema>;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;

// Utility types for frontend
export type ExpenseWithFormattedAmount = Expense & {
  formattedAmount: string;
  formattedDate: string;
  initials: string;
};

export type ExpenseStats = {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalAmount: string;
};
