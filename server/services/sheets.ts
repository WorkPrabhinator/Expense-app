import { google } from 'googleapis';
import { storage } from '../storage';
import type { Expense } from '@shared/schema';

export class SheetsService {
  private sheets: any;
  private spreadsheetId: string;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID || '';
  }

  async initializeSheet(): Promise<void> {
    try {
      // Check if sheet exists and has proper headers
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Expenses!A1:Z1',
      });

      if (!response.data.values || response.data.values.length === 0) {
        // Create headers
        await this.createHeaders();
      }
    } catch (error) {
      console.error('Error initializing sheet:', error);
      throw error;
    }
  }

  private async createHeaders(): Promise<void> {
    const headers = [
      'ID',
      'Employee Name',
      'Employee Email',
      'Department',
      'Amount',
      'Description',
      'Category',
      'Expense Date',
      'Submission Date',
      'Status',
      'Approved By',
      'Approval Date',
      'Approval Note',
      'Receipt URL',
      'Email ID',
    ];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: 'Expenses!A1:O1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    });
  }

  async addExpense(expense: Expense): Promise<number> {
    try {
      const values = [
        expense.id,
        expense.employeeName,
        expense.employeeEmail,
        expense.department,
        expense.amount,
        expense.description,
        expense.category,
        expense.expenseDate.toISOString().split('T')[0],
        expense.submissionDate.toISOString().split('T')[0],
        expense.status,
        expense.approvedByName || '',
        expense.approvalDate ? expense.approvalDate.toISOString().split('T')[0] : '',
        expense.approvalNote || '',
        expense.receiptUrl || '',
        expense.emailId || '',
      ];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Expenses!A:O',
        valueInputOption: 'RAW',
        requestBody: {
          values: [values],
        },
      });

      // Get the row number from the response
      const updatedRange = response.data.updates?.updatedRange;
      const rowMatch = updatedRange?.match(/(\d+)$/);
      const rowNumber = rowMatch ? parseInt(rowMatch[1]) : 0;

      // Update the expense with the row number
      if (rowNumber > 0) {
        await storage.updateExpense(expense.id, { sheetsRowNumber: rowNumber });
      }

      return rowNumber;
    } catch (error) {
      console.error('Error adding expense to sheet:', error);
      throw error;
    }
  }

  async updateExpenseStatus(expense: Expense): Promise<void> {
    if (!expense.sheetsRowNumber) {
      console.warn(`No sheet row number for expense ${expense.id}`);
      return;
    }

    try {
      const values = [
        [
          expense.status,
          expense.approvedByName || '',
          expense.approvalDate ? expense.approvalDate.toISOString().split('T')[0] : '',
          expense.approvalNote || '',
        ],
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `Expenses!J${expense.sheetsRowNumber}:M${expense.sheetsRowNumber}`,
        valueInputOption: 'RAW',
        requestBody: {
          values,
        },
      });

      console.log(`Updated expense ${expense.id} status in sheet row ${expense.sheetsRowNumber}`);
    } catch (error) {
      console.error('Error updating expense status in sheet:', error);
      throw error;
    }
  }

  async syncExpensesToSheet(): Promise<void> {
    try {
      const expenses = await storage.getAllExpenses();
      
      for (const expense of expenses) {
        if (!expense.sheetsRowNumber) {
          await this.addExpense(expense);
        }
      }
    } catch (error) {
      console.error('Error syncing expenses to sheet:', error);
      throw error;
    }
  }
}

export const sheetsService = new SheetsService();
