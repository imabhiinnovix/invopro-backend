/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema, model, Document, Types } from 'mongoose';

export interface IVendorInvoice extends Document {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  vendorId: Types.ObjectId;

  invoiceNumber: string;
  invoiceDate?: Date;

  invoiceTotalValue: number;
  invoiceTotalServiceFee: number;
  invoiceTotalOfficialFee: number;

  invoiceStatus: 'open' | 'closed';
  status?: string;

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

    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },

    invoiceDate: {
      type: Date,
    },

    invoiceTotalServiceFee: {
      type: Number,
      default: 0,
    },

    invoiceTotalOfficialFee: {
      type: Number,
      default: 0,
    },

    invoiceTotalValue: {
      type: Number,
      default: 0,
    },

    invoiceStatus: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },

    status: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Indexes
vendorInvoiceSchema.index(
  { organizationId: 1, invoiceNumber: 1 },
  { unique: true }
);
vendorInvoiceSchema.index({ vendorId: 1 });
vendorInvoiceSchema.index({ userId: 1 });

const VendorInvoice = model<IVendorInvoice>(
  'VendorInvoice',
  vendorInvoiceSchema
);

export default VendorInvoice;