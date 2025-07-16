import { google } from 'googleapis';

export class DriveService {
  private drive: any;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    this.drive = google.drive({ version: 'v3', auth });
  }

  async uploadReceipt(fileName: string, mimeType: string, buffer: Buffer): Promise<string> {
    // If you have a specific receipts folder, set its ID here
    // const folderId = 'YOUR_RECEIPTS_FOLDER_ID';
    const fileMetadata: any = {
      name: fileName,
      // parents: [folderId], // uncomment and set if needed
    };
    const media = {
      mimeType,
      body: Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer),
    };

    const file = await this.drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id',
    });

    const fileId = file.data.id;

    // Make the file publicly readable (or restrict as desired)
    await this.drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Get the shareable link
    const result = await this.drive.files.get({
      fileId,
      fields: 'webViewLink, webContentLink',
    });

    return result.data.webViewLink || result.data.webContentLink || '';
  }
}

export const driveService = new DriveService();
