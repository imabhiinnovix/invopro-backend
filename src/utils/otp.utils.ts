import config from "../config";
import { createOtp } from "../database/services/common/otp.service";
import { sendEmail } from "./mail.util";


export const sendEmailOtp = async (user: any, type: string = 'login') => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(
    Date.now() + config.OTP_EXPIRATION_TIME * 60 * 1000
  );

  await createOtp({
    userId: user._id,
    otp,
    type,
    expiresAt,
  });

  await sendEmail({
    name: user.firstName,
    email: user.email,
    subject: `Reportivix ${type === 'login' ? 'Login' : 'Reset Password'} OTP Verification`,
    message: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h1 style="color: #4CAF50;">Hello ${user.firstName},</h1>
        <p>Please use the One-Time Password (OTP) below to verify your identity:</p>
        <h2 style="color: #333;">${otp}</h2>
        <p>
          This OTP is valid for the next
          <strong>${config.OTP_EXPIRATION_TIME} minutes</strong>.
          For your safety, please do not share it with anyone.
        </p>
        <p>
          If you did not request this verification code, no further action is needed—your account remains safe.
        </p>
        <p>Thank you for choosing Reportivix!</p>
        <p style="color: #4CAF50;">
          Best regards,<br />
          The Reportivix Team
        </p>
      </div>
    `,
  });
};
