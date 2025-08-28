/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Document, Types } from 'mongoose';

export interface ISupport extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const supportSchema = new Schema<ISupport>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    message: { type: String, required: true },
    status: { type: String, default: 'pending' }, // 1. pending, 2. completed
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export default model<ISupport>('Support', supportSchema);
