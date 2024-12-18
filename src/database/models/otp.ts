import { Schema, model, Document, Types } from 'mongoose';
import config from '../../config';

export interface IOtp extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  otp: string;
  type: string;
  isVerified: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new Schema<IOtp>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    otp: { type: String, required: true },
    type: { type: String, enum: ['login', 'reset-password'], required: true, default: 'login' },
    isVerified: { type: Boolean, default: false },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + config.OTP_EXPIRATION_TIME * 60 * 1000), // 5 minutes from now
      index: { expires: `${config.OTP_EXPIRATION_TIME}m` }, // MongoDB TTL index to automatically delete
    },
  },
  {
    timestamps: true,
  }
);

export default model<IOtp>('Otp', otpSchema);
