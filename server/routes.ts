import type { Express } from "express";
import { driveService } from './services/drive';
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { gmailService } from "./services/gmail";
import { sheetsService } from "./services/sheets";
import { notificationService } from "./services/notifications";
import { insertExpenseSchema, updateExpenseStatusSchema } from "@shared/schema";
import { z } from "zod";

// Simple session storage for demo purposes
const sessions = new Map<string, { userId: number; email: string; createdAt: Date }>();

// Middleware to check authentication
function requireAuth(req: any, res: any, next: any) {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  const session = sessionId ? sessions.get(sessionId) : null;
  
  if (!session) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  req.user = session;
  next();
}

// Simple login endpoint
async function handleLogin(req: any, res: any) {
  try {
    const { email } = req.body;
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    // Generate simple session token
    const sessionId = Math.random().toString(36).substring(2, 15);
    sessions.set(sessionId, { userId: user.id, email: user.email, createdAt: new Date() });
    
    res.json({ 
      token: sessionId, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: "Login failed" });
  }
}

async function handleRegister(req: any, res: any) {
  try {
    const { email, name, department } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({ message: "Email and name are required" });
    }
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: "User already exists with this email" });
    }
    
    // Create new user (default role is 'employee')
    const newUser = await storage.createUser({
      email,
      name,
      role: 'employee',
      department: department || null,
    });
    
    // Create session
    const sessionId = Math.random().toString(36).substring(2, 15);
    sessions.set(sessionId, { userId: newUser.id, email: newUser.email, createdAt: new Date() });
    
    res.json({ 
      token: sessionId, 
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        department: newUser.department,
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: "Registration failed" });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", handleLogin);
  app.post("/api/auth/register", handleRegister);
  
  app.get("/api/auth/me", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Expense routes
  app.get("/api/expenses", requireAuth, async (req: any, res) => {
    try {
      const { status, employee } = req.query;
      let expenses;
      
      if (status) {
        expenses = await storage.getExpensesByStatus(status as string);
      } else if (employee && req.user.userId.toString() === employee) {
        expenses = await storage.getExpensesByEmployee(parseInt(employee));
      } else {
        expenses = await storage.getAllExpenses();
      }
      
      // Format expenses for frontend
      const formattedExpenses = expenses.map(expense => ({
        ...expense,
        formattedAmount: `$${parseFloat(expense.amount).toFixed(2)}`,
        formattedDate: expense.expenseDate.toISOString().split('T')[0],
        initials: expense.employeeName.split(' ').map(n => n[0]).join('').toUpperCase(),
      }));
      
      res.json(formattedExpenses);
    } catch (error) {
      console.error('Get expenses error:', error);
      res.status(500).json({ message: "Failed to get expenses" });
    }
  });

  app.get("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const expense = await storage.getExpense(id);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.json({
        ...expense,
        formattedAmount: `$${parseFloat(expense.amount).toFixed(2)}`,
        formattedDate: expense.expenseDate.toISOString().split('T')[0],
        initials: expense.employeeName.split(' ').map(n => n[0]).join('').toUpperCase(),
      });
    } catch (error) {
      console.error('Get expense error:', error);
      res.status(500).json({ message: "Failed to get expense" });
    }
  });

  app.post("/api/expenses", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Handle mileage calculations
      let calculatedAmount = req.body.amount;
      if (req.body.mileageDistance && req.body.mileageRate) {
        const distance = parseFloat(req.body.mileageDistance);
        const rate = parseFloat(req.body.mileageRate);
        calculatedAmount = (distance * rate).toFixed(2);
      }

      let receiptUrl = req.body.receiptUrl || "";
      if (req.body.receiptFileData && req.body.receiptFileType && req.body.receiptFileName) {
        const buffer = Buffer.from(req.body.receiptFileData, 'base64');
        receiptUrl = await driveService.uploadReceipt(
          req.body.receiptFileName,
          req.body.receiptFileType,
          buffer
      );
      }

      const expenseData = insertExpenseSchema.parse({
        ...req.body,
        amount: calculatedAmount,
        employeeId: user.id,
        employeeName: user.name,
        employeeEmail: user.email,
        department: user.department,
        receiptUrl,
      });
      
      const expense = await storage.createExpense(expenseData);
      
      // Add to Google Sheets
      try {
        await sheetsService.addExpense(expense);
      } catch (error) {
        console.error('Failed to add to sheets:', error);
      }
      
      // Send notification to approvers
      try {
        await notificationService.sendExpenseSubmissionNotification(expense);
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
      
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error('Create expense error:', error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.patch("/api/expenses/:id/status", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(req.user.userId);
      
      if (!user || (user.role !== 'approver' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const updateData = updateExpenseStatusSchema.parse({
        ...req.body,
        approvedBy: user.id,
        approvedByName: user.name,
      });
      
      const expense = await storage.updateExpenseStatus(id, updateData);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      // Update Google Sheets
      try {
        await sheetsService.updateExpenseStatus(expense);
      } catch (error) {
        console.error('Failed to update sheets:', error);
      }
      
      // Send notification to employee
      try {
        await notificationService.sendApprovalNotification(expense);
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
      
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error('Update expense status error:', error);
      res.status(500).json({ message: "Failed to update expense status" });
    }
  });

  // Stats endpoint
  app.get("/api/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getExpenseStats();
      res.json({
        ...stats,
        totalAmount: `$${stats.totalAmount.toFixed(2)}`,
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  // Mileage rate endpoint
  app.get("/api/mileage-rate", requireAuth, async (req, res) => {
    try {
      const rateSetting = await storage.getSetting("mileage_rate");
      const rate = rateSetting ? parseFloat(rateSetting.value) : 0.68; // Default Canadian rate
      res.json({ rate });
    } catch (error) {
      console.error('Get mileage rate error:', error);
      res.status(500).json({ message: "Failed to get mileage rate" });
    }
  });

  // Background job endpoints (for testing)
  app.post("/api/admin/sync-emails", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      await gmailService.checkForNewExpenseEmails();
      res.json({ message: "Email sync completed" });
    } catch (error) {
      console.error('Email sync error:', error);
      res.status(500).json({ message: "Email sync failed" });
    }
  });

  app.post("/api/admin/sync-sheets", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      await sheetsService.syncExpensesToSheet();
      res.json({ message: "Sheets sync completed" });
    } catch (error) {
      console.error('Sheets sync error:', error);
      res.status(500).json({ message: "Sheets sync failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
