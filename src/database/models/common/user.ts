/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  email: string;
  password: string;
  roleIds?: Types.ObjectId[];
  firstName: string;
  lastName?: string;
  mobile?: number;
  isVerified: boolean;
  status: 'active' | 'inactive';
  organizationProductSubscriptionIds?: Types.ObjectId[];
  departmentId?: Types.ObjectId;
  designationId?: Types.ObjectId;
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: 'Organization',
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
      minlength: 7,
      trim: true,
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
      required: false,
    },
    mobile: {
      type: Number,
      required: false,
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
      required: false,
      ref: 'Department',
    },
    designationId: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: 'Designation',
    },
    address: {
      type: String,
      required: false,
    },
    country: {
      type: String,
      required: false,
    },
    state: {
      type: String,
      required: false,
    },
    city: {
      type: String,
      required: false,
    },
    postalCode: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const User = model<IUser>('user', userSchema);
export default User;
