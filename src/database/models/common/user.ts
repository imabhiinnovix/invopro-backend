/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Document, Types } from 'mongoose';
import config from '../../../config';

export interface IUser extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;

  email: string;
  password: string;

  // 🔐 Password security
  passwordChangedAt?: Date;
  passwordExpiresAt?: Date;
  passwordHistory: string[];

  // 🔒 Account lock (NO timeout)
  loginAttempts: number;
  isLocked: boolean;

  roleIds?: Types.ObjectId[];
  firstName: string;
  lastName?: string;
  mobile?: number;
  isVerified: boolean;
  status: 'active' | 'inactive';

  organizationProductSubscriptionIds?: Types.ObjectId[];
  departmentId?: Types.ObjectId;
  designationId?: Types.ObjectId;
  businessUnit?: Types.ObjectId[];
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  imagePath?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

const PASSWORD_EXPIRY_DAYS = config.PASSWORD_EXPIRY_DAYS || 90;

const userSchema = new Schema<IUser>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: false,
    },

    email: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8, // length only
      trim: true,
    },

    // Password expiry
    passwordChangedAt: {
      type: Date,
      default: Date.now,
    },

    passwordExpiresAt: {
      type: Date
    },

    // Prevent password reuse (hashed)
    passwordHistory: {
      type: [String],
      default: [],
    },

    // Account lock (reset only)
    loginAttempts: {
      type: Number,
      default: 0,
    },

    isLocked: {
      type: Boolean,
      default: false,
    },

    roleIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'user_role',
      },
    ],

    firstName: {
      type: String,
      required: true,
    },

    lastName: {
      type: String,
    },

    mobile: {
      type: Number,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },

    organizationProductSubscriptionIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'organization_product_subscription',
      },
    ],

    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
    },

    designationId: {
      type: Schema.Types.ObjectId,
      ref: 'Designation',
    },

    businessUnit: [
      {
        type: Schema.Types.ObjectId,
        ref: 'BusinessUnit',
      },
    ],

    address: String,
    country: String,
    state: String,
    city: String,
    postalCode: String,
    imagePath: String,
  },
  {
    timestamps: true,
  }
);

//
// Auto-set password expiry on password change
//
userSchema.pre('save', function (next) {
  if (!this.isModified('password')) return next();

  const now = new Date();
  this.passwordChangedAt = now;

  const expiryDate = new Date(now);
  expiryDate.setDate(expiryDate.getDate() + PASSWORD_EXPIRY_DAYS);

  this.passwordExpiresAt = expiryDate;
  next();
});

//
// Indexes (recommended)
//
userSchema.index({ email: 1 });
userSchema.index({ passwordExpiresAt: 1 });

const User = model<IUser>('user', userSchema);
export default User;