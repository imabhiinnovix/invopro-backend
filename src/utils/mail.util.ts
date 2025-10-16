/* eslint-disable @typescript-eslint/no-explicit-any */
// import nodemailer, { Transporter } from 'nodemailer';
// import { SentMessageInfo } from 'nodemailer';
// import config from '../config';

// // Define the function parameter types
// interface EmailOptions {
//   from: string;
//   to: string;
//   subject: string;
//   html: string;
// }

// export const sendSupportEmail = async (payload: any): Promise<SentMessageInfo> => {
//   try {
//     const { subject, name, email, message } = payload;
//     const testAccount = await nodemailer.createTestAccount();

//     const transporter: Transporter = nodemailer.createTransport({
//       host: config.EMAIL_HOST || testAccount.smtp.host,
//       port: Number(config.EMAIL_PORT) || testAccount.smtp.port,
//       secure: false,
//       auth: {
//         user: config.EMAIL_USER || testAccount.user,
//         pass: config.EMAIL_PASSWORD || testAccount.pass,
//       },
//     });

//     const mailOptions: EmailOptions = {
//       from: `"${name}" <${email}>`,
//       to: config.SUPPORT_EMAIL as string,
//       subject: `Searchivix Support Request: ${subject}`,
//       html: `
//       <div style="font-family: Arial, sans-serif; color: #333;">
//         <table width="100%" style="border-collapse: collapse;">
//           <tr>
//             <td style="background-color: #f2f2f2; padding: 20px; text-align: center;">
//               <h1 style="color: #5a5a5a; margin: 0;">Support Request</h1>
//             </td>
//           </tr>
//           <tr>
//             <td style="padding: 20px;">
//               <p><strong>Name:</strong> ${name}</p>
//               <p><strong>Email:</strong> ${email}</p>
//               <p><strong>Subject:</strong> ${subject}</p>
//               <hr style="border: 0; border-top: 1px solid #ccc;" />
//               <p><strong>Message:</strong></p>
//               <p style="padding: 10px; background-color: #f9f9f9; border-left: 5px solid #e0e0e0;">
//                 ${message}
//               </p>
//             </td>
//           </tr>
//           <tr>
//             <td style="background-color: #f2f2f2; padding: 20px; text-align: center;">
//               <p style="font-size: 12px; color: #777;">This email was sent by ${email}</p>
//             </td>
//           </tr>
//         </table>
//       </div>
//     `,
//     };

//     // Send the email and return the result
//     const info: SentMessageInfo = await transporter.sendMail(mailOptions);

//     return info;
//   } catch (error) {
//     console.error('Error sending email:', error);
//     throw error; // Re-throw to handle in the controller
//   }
// };

// export const sendEmail = async (payload: any): Promise<SentMessageInfo> => {
//   try {
//     const { subject, name, email, message } = payload;
//     const testAccount = await nodemailer.createTestAccount();

//     const transporter: Transporter = nodemailer.createTransport({
//       host: config.EMAIL_HOST || testAccount.smtp.host,
//       port: Number(config.EMAIL_PORT) || testAccount.smtp.port,
//       secure: false,
//       auth: {
//         user: config.EMAIL_USER || testAccount.user,
//         pass: config.EMAIL_PASSWORD || testAccount.pass,
//       },
//     });

//     const mailOptions: EmailOptions = {
//       from: config.EMAIL_USER,
//       to: `"${name}" <${email}>`,
//       subject: subject,
//       html: message,
//     };

//     // Send the email and return the result
//     const info: SentMessageInfo = await transporter.sendMail(mailOptions);

//     return info;
//   } catch (error) {
//     console.error('Error sending email:', error);
//     throw error; // Re-throw to handle in the controller
//   }
// };


/* eslint-disable @typescript-eslint/no-explicit-any */
import mailgun from "mailgun-js";
import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";
import config from "../config";

dotenv.config();

const DOMAIN = process.env.MAILGUN_DOMAIN || "notivixlabs.com";
const API_KEY = process.env.MAILGUN_SECRET || "";
const FROM_NAME = process.env.EMAIL_FROM_NAME || "Orion";
const FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS || `orion@${DOMAIN}`;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || config.SUPPORT_EMAIL;

if (!API_KEY) {
  throw new Error("MAILGUN_SECRET is not set!");
}

const mg = mailgun({ apiKey: API_KEY, domain: DOMAIN });

export interface EmailOptions {
  from?: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  attachments?: { fileName: string; filePath?: string; isDeleted?: boolean }[];
}

/**
 * Core mail sending function using Mailgun
 */
async function sendMail(payload: EmailOptions) {
  try {
    const data: mailgun.messages.SendData = {
      from: payload.from || `${FROM_NAME} <${FROM_EMAIL}>`,
      to: payload.to.join(","),
      subject: payload.subject,
      html: payload.body,
    };

    if (payload.cc && payload.cc.length > 0) {
      data.cc = payload.cc.join(",");
    }

    // Handle attachments
    const attachmentsToDelete: string[] = [];
    if (payload.attachments && payload.attachments.length > 0) {
      data.attachment = payload.attachments
        .filter((a) => a.filePath && fs.existsSync(a.filePath))
        .map((a) => {
          if (a.isDeleted === true) attachmentsToDelete.push(a.filePath!);
          return new mg.Attachment({
            data: fs.createReadStream(path.resolve(a.filePath!)),
            filename: a.fileName,
          });
        });
    }

    const response = await mg.messages().send(data);
    console.log(`✉️  Email sent successfully:`, response.id);

    // Clean up deleted attachments
    for (const filePath of attachmentsToDelete) {
      try {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Deleted temp attachment: ${filePath}`);
      } catch (err) {
        console.warn(`⚠️ Failed to delete temp file ${filePath}:`, err);
      }
    }

    return response;
  } catch (err) {
    console.error("❌ Failed to send email:", err);
    throw err;
  }
}

/**
 * Sends a support request email to the configured SUPPORT_EMAIL
 */
export const sendSupportEmail = async (payload: any) => {
  const { subject, name, email, message } = payload;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <table width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="background-color: #f2f2f2; padding: 20px; text-align: center;">
            <h1 style="color: #5a5a5a; margin: 0;">Support Request</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <hr style="border: 0; border-top: 1px solid #ccc;" />
            <p><strong>Message:</strong></p>
            <p style="padding: 10px; background-color: #f9f9f9; border-left: 5px solid #e0e0e0;">
              ${message}
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f2f2f2; padding: 20px; text-align: center;">
            <p style="font-size: 12px; color: #777;">This email was sent by ${email}</p>
          </td>
        </tr>
      </table>
    </div>
  `;

  return sendMail({
    from: `"${name}" <${email}>`,
    to: [SUPPORT_EMAIL],
    subject: `Reportivix Support Request: ${subject}`,
    body: htmlBody,
  });
};

/**
 * Sends a generic email (e.g., notification or message)
 */
export const sendEmail = async (payload: any) => {
  const { subject, name, email, message } = payload;

  return sendMail({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: [`"${name}" <${email}>`],
    subject,
    body: message,
  });
};

