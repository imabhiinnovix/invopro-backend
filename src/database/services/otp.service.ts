/* eslint-disable @typescript-eslint/no-explicit-any */
import Otp from '../models/otp';

export const createOtp = async (otpData: any) => {
  try {
    const otp = new Otp(otpData);
    await otp.save();
    return otp;
  } catch (err) {
    throw err;
  }
};

export const findOtp = async (query: any) => {
  try {
    const otp = await Otp.findOne(query);
    return otp;
  } catch (err) {
    throw err;
  }
};

export const updateOtp = async (otpId: string, otpData: any) => {
  try {
    const otp = await Otp.findByIdAndUpdate(otpId, otpData, { new: true });
    return otp;
  } catch (err) {
    throw err;
  }
};

export const deleteOtp = async (otpId: string) => {
  try {
    await Otp.findByIdAndDelete(otpId);
  } catch (err) {
    throw err;
  }
};

export const countOtps = async (query): Promise<number> => {
  try {
    const count = await Otp.countDocuments(query);
    return count;
  } catch (error) {
    console.error('Error counting OTPs sent:', error);
    throw error;
  }
};
