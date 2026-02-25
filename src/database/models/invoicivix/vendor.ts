/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Document, Types } from 'mongoose';

interface IVendor extends Document {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;

  name: string;
  code: string;
  description?: string;

  status: string;

  // Contact / Business Info
  logo?: string;
  email?: string;
  phone?: string;
  mobile?: number;

  // Address
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;

  // Tax
  gst?: string;
  pan?: string;

  // Billing
  defaultCurrency: string;

  createdAt: Date;
  updatedAt: Date;
}

const vendorSchema = new Schema<IVendor>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true,
    },

    name: { type: String, required: true },

    code: {
      type: String,
      required: true,
      unique: true, // 🔥 globally unique
      trim: true,
    },

    description: { type: String },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },

    // Contact / Business Info
    logo: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    mobile: { type: Number },

    // Address
    address1: { type: String, default: '' },
    address2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zip: { type: String, default: '' },
    country: { type: String, default: '' },

    // Tax
    gst: { type: String, default: '' },
    pan: { type: String, default: '' },

    // Billing
    defaultCurrency: {
      type: String,
      required: true,
      default: 'USD',
    },
  },
  {
    timestamps: true,
  }
);

// Search optimization
vendorSchema.index({ organizationId: 1, name: 1 });

const Vendor = model<IVendor>('Vendor', vendorSchema);

export default Vendor;