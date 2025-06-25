import { gmailService } from './gmail';
import { storage } from '../storage';
import type { Expense } from '@shared/schema';

export class NotificationService {
  async sendExpenseSubmissionNotification(expense: Expense): Promise<void> {
    try {
      // Get all approvers
      const approvers = await this.getApprovers();
      
      if (approvers.length === 0) {
        console.warn('No approvers found to notify');
        return;
      }

      const subject = `New Expense Report Submitted - $${expense.amount}`;
      const body = this.generateSubmissionEmailBody(expense);

      for (const approver of approvers) {
        await gmailService.sendNotificationEmail(approver.email, subject, body);
      }

      console.log(`Sent submission notifications for expense ${expense.id}`);
    } catch (error) {
      console.error('Error sending submission notification:', error);
    }
  }

  async sendApprovalNotification(expense: Expense): Promise<void> {
    try {
      const subject = `Expense Report ${expense.status === 'approved' ? 'Approved' : 'Rejected'} - $${expense.amount}`;
      const body = this.generateApprovalEmailBody(expense);

      await gmailService.sendNotificationEmail(expense.employeeEmail, subject, body);

      // Mark notification as sent
      await storage.updateExpense(expense.id, { notificationSent: true });

      console.log(`Sent ${expense.status} notification to ${expense.employeeEmail} for expense ${expense.id}`);
    } catch (error) {
      console.error('Error sending approval notification:', error);
    }
  }

  private async getApprovers(): Promise<Array<{ email: string; name: string }>> {
    // In a real implementation, this would query the database
    // For now, return default approvers
    return [
      { email: 'manager@agency.com', name: 'Finance Manager' },
      { email: 'admin@agency.com', name: 'Admin User' },
    ];
  }

  private generateSubmissionEmailBody(expense: Expense): string {
    return `
A new expense report has been submitted and is awaiting your approval.

Expense Details:
- Employee: ${expense.employeeName}
- Department: ${expense.department}
- Amount: $${expense.amount}
- Date: ${expense.expenseDate.toISOString().split('T')[0]}
- Description: ${expense.description}
- Category: ${expense.category}

Please log in to the ExpenseFlow system to review and approve this expense.

${expense.receiptUrl ? `Receipt: ${expense.receiptUrl}` : ''}

Best regards,
ExpenseFlow System
    `.trim();
  }

  private generateApprovalEmailBody(expense: Expense): string {
    const statusText = expense.status === 'approved' ? 'approved' : 'rejected';
    
    return `
Your expense report has been ${statusText}.

Expense Details:
- Amount: $${expense.amount}
- Date: ${expense.expenseDate.toISOString().split('T')[0]}
- Description: ${expense.description}
- Status: ${expense.status.toUpperCase()}
- ${expense.status === 'approved' ? 'Approved' : 'Reviewed'} by: ${expense.approvedByName}
- ${expense.status === 'approved' ? 'Approval' : 'Review'} Date: ${expense.approvalDate?.toISOString().split('T')[0]}

${expense.approvalNote ? `Note: ${expense.approvalNote}` : ''}

${expense.status === 'approved' 
  ? 'Your expense will be processed for reimbursement according to company policy.' 
  : 'If you have questions about this decision, please contact your manager or the finance team.'}

Best regards,
ExpenseFlow System
    `.trim();
  }

  async processNotificationQueue(): Promise<void> {
    try {
      // Get expenses that need notifications
      const expenses = await storage.getAllExpenses();
      const pendingNotifications = expenses.filter(
        expense => !expense.notificationSent && expense.status !== 'pending'
      );

      for (const expense of pendingNotifications) {
        await this.sendApprovalNotification(expense);
      }
    } catch (error) {
      console.error('Error processing notification queue:', error);
    }
  }
}

export const notificationService = new NotificationService();
