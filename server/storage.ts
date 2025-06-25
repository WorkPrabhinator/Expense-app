import { 
  users, 
  expenses, 
  systemSettings,
  type User, 
  type InsertUser,
  type Expense,
  type InsertExpense,
  type UpdateExpenseStatus,
  type SystemSetting,
  type InsertSystemSetting
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // Expenses
  getExpense(id: number): Promise<Expense | undefined>;
  getAllExpenses(): Promise<Expense[]>;
  getExpensesByStatus(status: string): Promise<Expense[]>;
  getExpensesByEmployee(employeeId: number): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpenseStatus(id: number, updates: UpdateExpenseStatus): Promise<Expense | undefined>;
  updateExpense(id: number, updates: Partial<Expense>): Promise<Expense | undefined>;
  
  // System Settings
  getSetting(key: string): Promise<SystemSetting | undefined>;
  setSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  
  // Stats
  getExpenseStats(): Promise<{
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    totalAmount: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private expenses: Map<number, Expense>;
  private settings: Map<string, SystemSetting>;
  private currentUserId: number;
  private currentExpenseId: number;
  private currentSettingId: number;

  constructor() {
    this.users = new Map();
    this.expenses = new Map();
    this.settings = new Map();
    this.currentUserId = 1;
    this.currentExpenseId = 1;
    this.currentSettingId = 1;

    // Initialize with default admin user
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    // Create default admin user
    await this.createUser({
      email: "admin@agency.com",
      name: "Admin User",
      department: "Administration",
      role: "admin",
      isActive: true,
    });

    // Create default approver
    await this.createUser({
      email: "manager@agency.com",
      name: "Finance Manager",
      department: "Finance",
      role: "approver",
      isActive: true,
    });

    // Create sample employees
    await this.createUser({
      email: "sarah@agency.com",
      name: "Sarah Miller",
      department: "Marketing",
      role: "employee",
      isActive: true,
    });

    await this.createUser({
      email: "michael@agency.com",
      name: "Michael Johnson",
      department: "Engineering",
      role: "employee",
      isActive: true,
    });

    // Set default system settings
    await this.setSetting({
      key: "gmail_enabled",
      value: "true",
    });

    await this.setSetting({
      key: "sheets_enabled",
      value: "true",
    });

    await this.setSetting({
      key: "notifications_enabled",
      value: "true",
    });

    // Add sample expenses for testing
    await this.createExpense({
      employeeId: 3,
      employeeName: "Sarah Miller",
      employeeEmail: "sarah@agency.com",
      department: "Marketing",
      amount: "156.50",
      description: "Team lunch at The Bistro",
      category: "Meals & Entertainment",
      expenseDate: new Date("2025-06-23"),
    });

    await this.createExpense({
      employeeId: 4,
      employeeName: "Michael Johnson",
      employeeEmail: "michael@agency.com",
      department: "Engineering",
      amount: "89.99",
      description: "Uber to client meeting",
      category: "Transportation",
      expenseDate: new Date("2025-06-22"),
    });

    await this.createExpense({
      employeeId: 3,
      employeeName: "Sarah Miller",
      employeeEmail: "sarah@agency.com",
      department: "Marketing",
      amount: "299.00",
      description: "Software license for design tools",
      category: "Software",
      expenseDate: new Date("2025-06-21"),
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      id,
      email: insertUser.email,
      name: insertUser.name,
      department: insertUser.department || null,
      role: insertUser.role || "employee",
      isActive: insertUser.isActive ?? true,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }

  async getAllExpenses(): Promise<Expense[]> {
    return Array.from(this.expenses.values()).sort(
      (a, b) => b.submissionDate.getTime() - a.submissionDate.getTime()
    );
  }

  async getExpensesByStatus(status: string): Promise<Expense[]> {
    return Array.from(this.expenses.values())
      .filter(expense => expense.status === status)
      .sort((a, b) => b.submissionDate.getTime() - a.submissionDate.getTime());
  }

  async getExpensesByEmployee(employeeId: number): Promise<Expense[]> {
    return Array.from(this.expenses.values())
      .filter(expense => expense.employeeId === employeeId)
      .sort((a, b) => b.submissionDate.getTime() - a.submissionDate.getTime());
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const id = this.currentExpenseId++;
    const expense: Expense = {
      id,
      employeeId: insertExpense.employeeId,
      employeeName: insertExpense.employeeName,
      employeeEmail: insertExpense.employeeEmail,
      department: insertExpense.department || null,
      amount: insertExpense.amount.toString(),
      description: insertExpense.description,
      category: insertExpense.category,
      expenseDate: insertExpense.expenseDate,
      submissionDate: new Date(),
      status: "pending",
      approvedBy: null,
      approvedByName: null,
      approvalDate: null,
      approvalNote: null,
      receiptUrl: insertExpense.receiptUrl || null,
      receiptFileName: insertExpense.receiptFileName || null,
      emailId: insertExpense.emailId || null,
      formSubmissionId: insertExpense.formSubmissionId || null,
      sheetsRowNumber: insertExpense.sheetsRowNumber || null,
      notificationSent: false,
    };
    this.expenses.set(id, expense);
    return expense;
  }

  async updateExpenseStatus(id: number, updates: UpdateExpenseStatus): Promise<Expense | undefined> {
    const expense = this.expenses.get(id);
    if (!expense) return undefined;

    const updatedExpense: Expense = {
      ...expense,
      status: updates.status,
      approvalNote: updates.approvalNote || null,
      approvedBy: updates.approvedBy,
      approvedByName: updates.approvedByName,
      approvalDate: new Date(),
      notificationSent: false, // Reset to send new notification
    };

    this.expenses.set(id, updatedExpense);
    return updatedExpense;
  }

  async updateExpense(id: number, updates: Partial<Expense>): Promise<Expense | undefined> {
    const expense = this.expenses.get(id);
    if (!expense) return undefined;

    const updatedExpense = { ...expense, ...updates };
    this.expenses.set(id, updatedExpense);
    return updatedExpense;
  }

  async getSetting(key: string): Promise<SystemSetting | undefined> {
    return this.settings.get(key);
  }

  async setSetting(setting: InsertSystemSetting): Promise<SystemSetting> {
    const existing = this.settings.get(setting.key);
    if (existing) {
      const updated: SystemSetting = {
        ...existing,
        value: setting.value,
        updatedAt: new Date(),
      };
      this.settings.set(setting.key, updated);
      return updated;
    } else {
      const id = this.currentSettingId++;
      const newSetting: SystemSetting = {
        ...setting,
        id,
        updatedAt: new Date(),
      };
      this.settings.set(setting.key, newSetting);
      return newSetting;
    }
  }

  async getExpenseStats(): Promise<{
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    totalAmount: number;
  }> {
    const allExpenses = Array.from(this.expenses.values());
    
    return {
      pendingCount: allExpenses.filter(e => e.status === "pending").length,
      approvedCount: allExpenses.filter(e => e.status === "approved").length,
      rejectedCount: allExpenses.filter(e => e.status === "rejected").length,
      totalAmount: allExpenses
        .filter(e => e.status === "approved")
        .reduce((sum, e) => sum + parseFloat(e.amount), 0),
    };
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense || undefined;
  }

  async getAllExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.submissionDate));
  }

  async getExpensesByStatus(status: string): Promise<Expense[]> {
    return await db
      .select()
      .from(expenses)
      .where(eq(expenses.status, status))
      .orderBy(desc(expenses.submissionDate));
  }

  async getExpensesByEmployee(employeeId: number): Promise<Expense[]> {
    return await db
      .select()
      .from(expenses)
      .where(eq(expenses.employeeId, employeeId))
      .orderBy(desc(expenses.submissionDate));
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const [expense] = await db
      .insert(expenses)
      .values(insertExpense)
      .returning();
    return expense;
  }

  async updateExpenseStatus(id: number, updates: UpdateExpenseStatus): Promise<Expense | undefined> {
    const [expense] = await db
      .update(expenses)
      .set({
        status: updates.status,
        approvalNote: updates.approvalNote || null,
        approvedBy: updates.approvedBy,
        approvedByName: updates.approvedByName,
        approvalDate: new Date(),
        notificationSent: false,
      })
      .where(eq(expenses.id, id))
      .returning();
    return expense || undefined;
  }

  async updateExpense(id: number, updates: Partial<Expense>): Promise<Expense | undefined> {
    const [expense] = await db
      .update(expenses)
      .set(updates)
      .where(eq(expenses.id, id))
      .returning();
    return expense || undefined;
  }

  async getSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));
    return setting || undefined;
  }

  async setSetting(setting: InsertSystemSetting): Promise<SystemSetting> {
    const existing = await this.getSetting(setting.key);
    
    if (existing) {
      const [updated] = await db
        .update(systemSettings)
        .set({
          value: setting.value,
          updatedAt: new Date(),
        })
        .where(eq(systemSettings.key, setting.key))
        .returning();
      return updated;
    } else {
      const [newSetting] = await db
        .insert(systemSettings)
        .values(setting)
        .returning();
      return newSetting;
    }
  }

  async getExpenseStats(): Promise<{
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    totalAmount: number;
  }> {
    const allExpenses = await db.select().from(expenses);
    
    return {
      pendingCount: allExpenses.filter(e => e.status === "pending").length,
      approvedCount: allExpenses.filter(e => e.status === "approved").length,
      rejectedCount: allExpenses.filter(e => e.status === "rejected").length,
      totalAmount: allExpenses
        .filter(e => e.status === "approved")
        .reduce((sum, e) => sum + parseFloat(e.amount), 0),
    };
  }
}

// Initialize database with default data
async function initializeDatabase() {
  try {
    // Check if admin user exists
    const adminUser = await db.select().from(users).where(eq(users.email, "admin@agency.com"));
    
    if (adminUser.length === 0) {
      // Create default users
      await db.insert(users).values([
        {
          email: "admin@agency.com",
          name: "Admin User",
          department: "Administration",
          role: "admin",
          isActive: true,
        },
        {
          email: "manager@agency.com",
          name: "Finance Manager",
          department: "Finance",
          role: "approver",
          isActive: true,
        },
        {
          email: "sarah@agency.com",
          name: "Sarah Miller",
          department: "Marketing",
          role: "employee",
          isActive: true,
        },
        {
          email: "michael@agency.com",
          name: "Michael Johnson",
          department: "Engineering",
          role: "employee",
          isActive: true,
        },
      ]);

      // Create default system settings
      await db.insert(systemSettings).values([
        { key: "gmail_enabled", value: "true" },
        { key: "sheets_enabled", value: "true" },
        { key: "notifications_enabled", value: "true" },
      ]);

      // Add sample expenses
      await db.insert(expenses).values([
        {
          employeeId: 3,
          employeeName: "Sarah Miller",
          employeeEmail: "sarah@agency.com",
          department: "Marketing",
          amount: "156.50",
          description: "Team lunch at The Bistro",
          category: "Meals & Entertainment",
          expenseDate: new Date("2025-06-23"),
          status: "pending",
          approvedBy: null,
          approvedByName: null,
          approvalDate: null,
          approvalNote: null,
          receiptUrl: null,
          receiptFileName: null,
          emailId: null,
          formSubmissionId: null,
          sheetsRowNumber: null,
          notificationSent: false,
        },
        {
          employeeId: 4,
          employeeName: "Michael Johnson",
          employeeEmail: "michael@agency.com",
          department: "Engineering",
          amount: "89.99",
          description: "Uber to client meeting",
          category: "Transportation",
          expenseDate: new Date("2025-06-22"),
          status: "pending",
          approvedBy: null,
          approvedByName: null,
          approvalDate: null,
          approvalNote: null,
          receiptUrl: null,
          receiptFileName: null,
          emailId: null,
          formSubmissionId: null,
          sheetsRowNumber: null,
          notificationSent: false,
        },
        {
          employeeId: 3,
          employeeName: "Sarah Miller",
          employeeEmail: "sarah@agency.com",
          department: "Marketing",
          amount: "299.00",
          description: "Software license for design tools",
          category: "Software",
          expenseDate: new Date("2025-06-21"),
          status: "pending",
          approvedBy: null,
          approvedByName: null,
          approvalDate: null,
          approvalNote: null,
          receiptUrl: null,
          receiptFileName: null,
          emailId: null,
          formSubmissionId: null,
          sheetsRowNumber: null,
          notificationSent: false,
        },
      ]);

      console.log("Database initialized with default data");
    }
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

export const storage = new DatabaseStorage();

// Initialize database on startup
initializeDatabase();
