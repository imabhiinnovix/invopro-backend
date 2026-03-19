/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema, model, Document, Types } from 'mongoose';

export interface IVendorInvoice extends Document {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  vendorId: Types.ObjectId;

  versionValue: string; // e.g., "2026-03" for March 2026
  fileName: string;
  filePath: string;

  status: 'active' | 'inactive';

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const vendorInvoiceSchema = new Schema<IVendorInvoice>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },

    versionValue: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      required: true,
      default: 'active',
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const VendorInvoice = model<IVendorInvoice>(
  'VendorInvoice',
  vendorInvoiceSchema
);

export default VendorInvoice;