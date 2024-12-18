/* eslint-disable @typescript-eslint/no-explicit-any */
import nodemailer, { Transporter } from 'nodemailer';
import { SentMessageInfo } from 'nodemailer';
import config from '../config';

// Define the function parameter types
interface EmailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export const sendSupportEmail = async (payload: any): Promise<SentMessageInfo> => {
  try {
    const { subject, name, email, message } = payload;
    const testAccount = await nodemailer.createTestAccount();

    const transporter: Transporter = nodemailer.createTransport({
      host: config.EMAIL_HOST || testAccount.smtp.host,
      port: Number(config.EMAIL_PORT) || testAccount.smtp.port,
      secure: false,
      auth: {
        user: config.EMAIL_USER || testAccount.user,
        pass: config.EMAIL_PASSWORD || testAccount.pass,
      },
    });

    const mailOptions: EmailOptions = {
      from: `"${name}" <${email}>`,
      to: config.SUPPORT_EMAIL as string,
      subject: `Searchivix Support Request: ${subject}`,
      html: `
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
    `,
    };

    // Send the email and return the result
    const info: SentMessageInfo = await transporter.sendMail(mailOptions);

    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error; // Re-throw to handle in the controller
  }
};

export const sendEmail = async (payload: any): Promise<SentMessageInfo> => {
  try {
    const { subject, name, email, message } = payload;
    const testAccount = await nodemailer.createTestAccount();

    const transporter: Transporter = nodemailer.createTransport({
      host: config.EMAIL_HOST || testAccount.smtp.host,
      port: Number(config.EMAIL_PORT) || testAccount.smtp.port,
      secure: false,
      auth: {
        user: config.EMAIL_USER || testAccount.user,
        pass: config.EMAIL_PASSWORD || testAccount.pass,
      },
    });

    const mailOptions: EmailOptions = {
      from: config.EMAIL_USER,
      to: `"${name}" <${email}>`,
      subject: subject,
      html: message,
    };

    // Send the email and return the result
    const info: SentMessageInfo = await transporter.sendMail(mailOptions);

    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error; // Re-throw to handle in the controller
  }
};
