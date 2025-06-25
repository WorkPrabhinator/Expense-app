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

export const storage = new MemStorage();
