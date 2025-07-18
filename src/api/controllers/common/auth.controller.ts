/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';

import config from '../../../config';
import * as authService from '../../../database/services/common/user.service';
import * as userService from '../../../database/services/common/user.service';
import * as organizationService from '../../../database/services/common/organization.service';
import { IUser } from '../../../database/models/common/user';
import * as otpService from '../../../database/services/common/otp.service';
import { generateToken } from '../../../utils/token.utils';
import { comparePassword, hashPassword } from '../../../utils/bcrypt.utils';
import { Role } from '../../../enums/role.enum';
import { sendEmail } from '../../../utils/mail.util';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Check if email or password is missing
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // Find the user and populate the organization details
    const user: any = await authService.findUserByEmail(email.toLowerCase());

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if password matches
    const isPasswordMatch = await comparePassword(password, user.password);

    if (!isPasswordMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if user account is inactive
    if (user.status === 'inactive') {
      return res.status(400).json({
        success: false,
        message: 'Your account is currently inactive. Please contact support for further help.',
      });
    }

    // Check if organization is inactive or expired
    const organization = user.organizationId;
    if (organization) {
      // If organization is already inactive
      if (organization.status === 'inactive') {
        return res.status(400).json({
          success: false,
          message: 'Your organization is currently inactive. Please contact support for further help.',
        });
      }

      // const currentDate = new Date();
      // Check if the organization license is expired
      // if (organization.licenseExpiresAt && organization.licenseExpiresAt < currentDate) {
      //   // Update the organization status to "inactive"
      //   await organizationService.updateOrganization(organization._id, { status: 'inactive' });
      //   return res.status(400).json({
      //     success: false,
      //     message: 'Your organization license has expired. Please contact support for renewal.',
      //   });
      // }
    }

    // Generate JWT token
    const token = generateToken({
      userId: String(user._id),
      organizationId: String(user.organizationId?._id),
      orgCode: user.organizationId?.code,
    });

    // Send response
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { token },
    });
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, organizationId, roleId } = req.body;

    const existingUser = await authService.findUserByEmail(email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Check user status before creating a new user
    const statusCheck = await userService.checkUserStatus('active', organizationId);
    if (!statusCheck.success) {
      return res.status(400).json({ success: false, message: statusCheck.message });
    }

    const hashedPassword = await hashPassword(password);

    const user: IUser = await authService.createUser({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      organizationId,
      status: 'active',
      ...(roleId && { role: Role.Labels[roleId] || Role.Labels[Role.Id.USER] }),
      ...(roleId && { roleId }),
    });

    res.status(201).json({ success: true, message: 'User created successfully' });
  } catch (err) {
    next(err);
  }
};

export const sendOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, type = 'login' } = req.body;

    // Find the user and populate organization details
    const user: any = await authService.findUserByEmail(email);

    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    // Check user status (inactive accounts cannot request OTP)
    if (user.status === 'inactive') {
      return res.status(400).json({
        success: false,
        message: 'Your account is currently inactive. Please contact support for assistance.',
      });
    }

    // Check organization status and license expiry if the user is not a super admin
    if (user.roleId !== Role.Id.SUPER_ADMIN) {
      const organization = user.organizationId;

      if (organization) {
        const currentDate = new Date();

        // Check if the organization license is expired
        if (organization.licenseExpiresAt && organization.licenseExpiresAt < currentDate) {
          // Update the organization status to "inactive"
          await organizationService.updateOrganization(organization._id, { status: 'inactive' });
          return res.status(400).json({
            success: false,
            message: 'Your organization license has expired. Please contact support for renewal.',
          });
        }

        // Check if organization status is inactive
        if (organization.status === 'inactive') {
          return res.status(400).json({
            success: false,
            message: 'Your organization is currently inactive. Please contact support for assistance.',
          });
        }
      }
    }

    // Check OTP limit within the last hour
    const oneHourAgo = new Date(Date.now() - config.OTP_TIME_LIMIT * 60 * 1000);
    const recentOtps = await otpService.countOtps({
      userId: user._id,
      createdAt: { $gte: oneHourAgo },
    });

    if (recentOtps >= config.OTP_LIMIT) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please wait before trying again.',
      });
    }

    // Generate OTP and expiration time
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + config.OTP_EXPIRATION_TIME * 60 * 1000);

    // Create a new OTP entry
    await otpService.createOtp({ userId: user._id, otp, type, expiresAt });

    // Send OTP email (implementation not included)
    await sendEmail({
      name: user.firstName,
      email,
      subject: `Searchivix ${type === 'login' ? 'Login' : 'Reset Password'} OTP Verification`,
      message: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h1 style="color: #4CAF50;">Hello ${user.firstName},</h1>
        <p>Please use the One-Time Password (OTP) below to verify your identity:</p>
        <h2 style="color: #333;">${otp}</h2>
        <p>This OTP is valid for the next <strong>${config.OTP_EXPIRATION_TIME} minutes</strong>. For your safety, please do not share it with anyone.</p>
        <p>If you did not request this verification code, no further action is needed—your account remains safe.</p>
        <p>Thank you for choosing Reportivix!</p>
        <p style="color: #4CAF50;">Best regards,<br>The Reportivix Team</p>
      </div>
      `,
    });

    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    next(err);
  }
};

// verify otp
export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp, type = 'login' } = req.body;
    const user: any = await authService.findUserByEmail(email);

    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    const otpEntry = await otpService.findOtp({ userId: user._id, otp, type });

    if (!otpEntry) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // Check if OTP is expired
    if (otpEntry.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    if (otpEntry.isVerified) {
      return res.status(400).json({ success: false, message: 'OTP already verified' });
    }

    // Mark OTP as verified
    otpEntry.isVerified = true;
    await otpEntry.save();

    // Generate JWT token for login OTP
    if (type === 'login') {
      const token = generateToken({
        userId: user._id,
        organizationId: user.organizationId,
        roleId: user.roleId,
        orgCode: user.organizationId?.code,
      });
      return res.status(200).json({ success: true, message: 'OTP verified successfully', data: { token } });
    }

    // For reset-password OTP, just return success
    res.status(200).json({ success: true, message: 'OTP verified successfully' });
  } catch (err) {
    next(err);
  }
};

// reset password
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, newPassword, otp } = req.body;

    // Find the user by email
    const user: any = await authService.findUserByEmail(email);

    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    // Verify the OTP
    const otpEntry = await otpService.findOtp({ userId: user._id, otp, type: 'reset-password' });

    if (!otpEntry) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // Check if OTP is expired
    if (otpEntry.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    // Check if OTP is already verified
    if (otpEntry.isVerified) {
      return res.status(400).json({ success: false, message: 'OTP already verified' });
    }

    // Mark OTP as verified
    otpEntry.isVerified = true;
    await otpEntry.save();

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update the user's password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
};
