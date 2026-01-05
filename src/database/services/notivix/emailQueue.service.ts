// emailQueue.ts
import mailgun from "mailgun-js";
import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

const DOMAIN = process.env.MAILGUN_DOMAIN || "notivixlabs.com";
const API_KEY = process.env.MAILGUN_SECRET || "";
const FROM_NAME = process.env.EMAIL_FROM_NAME || "Orion";
const FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS || `orion@${DOMAIN}`;

if (!API_KEY) {
  throw new Error("MAILGUN_SECRET is not set!");
}

const mg = mailgun({ apiKey: API_KEY, domain: DOMAIN });

export interface EmailQueuePayload {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: { fileName: string; filePath?: string, isDeleted?: boolean }[];
  notificationId?: any;
}

export async function sendToQueue(payload: EmailQueuePayload) {
  try {
    const data: mailgun.messages.SendData = {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: payload.to.join(","),
      subject: payload.subject,
      html: payload.body,
    };

    if (payload.cc && payload.cc.length > 0) {
      data.cc = payload.cc.join(",");
    }

    if (payload.bcc && payload.bcc.length > 0) {
      data.bcc = payload.bcc.join(",");
    }

    // Attachments
    const attachmentsToDelete: string[] = [];
    if (payload.attachments && payload.attachments.length > 0) {
      data.attachment = payload.attachments
        .filter(a => a.filePath && fs.existsSync(a.filePath))
        .map(a => {
          if(a.isDeleted == true)
            attachmentsToDelete.push(a.filePath!); // mark for deletion
          return new mg.Attachment({
            data: fs.createReadStream(path.resolve(a.filePath!)),
            filename: a.fileName,
          });
        });
    }

    const response = await mg.messages().send(data);
    console.log(`✉️  Email sent for notification ${payload.notificationId}:`, response.id);

    // Clean up temporary files
    for (const filePath of attachmentsToDelete) {
      try {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Deleted temporary attachment: ${filePath}`);
      } catch (err) {
        console.warn(`⚠️ Failed to delete temp file ${filePath}:`, err);
      }
    }

    return response;
  } catch (err) {
    console.error(`❌ Failed to send email for notification ${payload.notificationId}:`, err);
    throw err;
  }
}
