import { gmail_v1, google } from 'googleapis';
import { storage } from '../storage';

export class GmailService {
  private gmail: gmail_v1.Gmail;

  constructor() {
    // Initialize Gmail API client
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
      ],
    });

    this.gmail = google.gmail({ version: 'v1', auth });
  }

  async checkForNewExpenseEmails(): Promise<void> {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: 'to:receipts@agency.com is:unread',
        maxResults: 50,
      });

      const messages = response.data.messages || [];

      for (const message of messages) {
        if (message.id) {
          await this.processExpenseEmail(message.id);
        }
      }
    } catch (error) {
      console.error('Error checking for new expense emails:', error);
      throw error;
    }
  }

  private async processExpenseEmail(messageId: string): Promise<void> {
    try {
      const message = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const headers = message.data.payload?.headers || [];
      const fromHeader = headers.find(h => h.name === 'From');
      const subjectHeader = headers.find(h => h.name === 'Subject');
      const dateHeader = headers.find(h => h.name === 'Date');

      if (!fromHeader?.value) {
        console.warn(`No sender found for message ${messageId}`);
        return;
      }

      const senderEmail = this.extractEmail(fromHeader.value);
      const subject = subjectHeader?.value || '';
      const emailDate = dateHeader?.value ? new Date(dateHeader.value) : new Date();

      // Get email body
      const body = this.extractEmailBody(message.data);
      
      // Parse expense details from email
      const expenseData = this.parseExpenseFromEmail(body, subject);

      if (!expenseData) {
        console.warn(`Could not parse expense data from email ${messageId}`);
        // Mark as read but don't process
        await this.markAsRead(messageId);
        return;
      }

      // Get user info
      const user = await storage.getUserByEmail(senderEmail);
      if (!user) {
        console.warn(`User not found for email ${senderEmail}`);
        return;
      }

      // Handle attachments (receipts)
      const receiptUrl = await this.processAttachments(message.data, messageId);

      // Create expense record
      await storage.createExpense({
        employeeId: user.id,
        employeeName: user.name,
        employeeEmail: user.email,
        department: user.department || 'Unknown',
        amount: expenseData.amount.toString(),
        description: expenseData.description,
        category: expenseData.category,
        expenseDate: expenseData.date,
        receiptUrl,
        emailId: messageId,
      });

      // Mark email as read
      await this.markAsRead(messageId);

      console.log(`Processed expense email from ${senderEmail}: $${expenseData.amount}`);
    } catch (error) {
      console.error(`Error processing email ${messageId}:`, error);
    }
  }

  private extractEmail(fromString: string): string {
    const emailMatch = fromString.match(/<(.+)>/);
    return emailMatch ? emailMatch[1] : fromString;
  }

  private extractEmailBody(message: gmail_v1.Schema$Message): string {
    if (!message.payload) return '';

    if (message.payload.body?.data) {
      return Buffer.from(message.payload.body.data, 'base64').toString();
    }

    if (message.payload.parts) {
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString();
        }
      }
    }

    return '';
  }

  private parseExpenseFromEmail(body: string, subject: string): {
    amount: number;
    description: string;
    category: string;
    date: Date;
  } | null {
    // Simple parsing logic - in production, this would be more sophisticated
    const amountMatch = body.match(/\$(\d+(?:\.\d{2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

    if (!amount) return null;

    // Extract description from subject or body
    let description = subject || 'Email expense submission';
    if (description.toLowerCase().includes('expense')) {
      description = description.replace(/expense/gi, '').trim();
    }

    // Simple category detection
    let category = 'Other';
    const lowerBody = body.toLowerCase() + ' ' + subject.toLowerCase();
    
    if (lowerBody.includes('meal') || lowerBody.includes('lunch') || lowerBody.includes('dinner')) {
      category = 'Meals & Entertainment';
    } else if (lowerBody.includes('hotel') || lowerBody.includes('accommodation')) {
      category = 'Lodging';
    } else if (lowerBody.includes('uber') || lowerBody.includes('taxi') || lowerBody.includes('transport')) {
      category = 'Transportation';
    } else if (lowerBody.includes('flight') || lowerBody.includes('airline')) {
      category = 'Travel';
    }

    return {
      amount,
      description: description || 'Expense from email',
      category,
      date: new Date(), // Use current date if not specified
    };
  }

  private async processAttachments(message: gmail_v1.Schema$Message, messageId: string): Promise<string | null> {
    if (!message.payload?.parts) return null;

    for (const part of message.payload.parts) {
      if (part.filename && part.body?.attachmentId) {
        try {
          const attachment = await this.gmail.users.messages.attachments.get({
            userId: 'me',
            messageId,
            id: part.body.attachmentId,
          });

          if (attachment.data.data) {
            // In a real implementation, you'd save this to Google Drive or another storage service
            // For now, we'll just return a placeholder URL
            return `https://storage.googleapis.com/receipts/${messageId}-${part.filename}`;
          }
        } catch (error) {
          console.error('Error processing attachment:', error);
        }
      }
    }

    return null;
  }

  private async markAsRead(messageId: string): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  async sendNotificationEmail(to: string, subject: string, body: string): Promise<void> {
    try {
      const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        body,
      ].join('\n');

      const encodedMessage = Buffer.from(message).toString('base64url');

      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      console.log(`Notification email sent to ${to}`);
    } catch (error) {
      console.error('Error sending notification email:', error);
      throw error;
    }
  }
}

export const gmailService = new GmailService();
