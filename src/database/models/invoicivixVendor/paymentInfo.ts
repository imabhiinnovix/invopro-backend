/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema, model, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  organizationId: Types.ObjectId;

  purchaseOrderId: Types.ObjectId;
  vendorId: Types.ObjectId; // ✅ NEW

  transactionId: string;

  referenceNo?: string;
  referenceDate?: Date;

  invoiceNumber: string[];
  creditNoteNumber: string[];

  paymentDate?: Date;
  paymentCurrency?: string;

  grossPaymentAmount?: number;
  taxDeduction?: number;
  actualPaymentAmount?: number;

  bankSwiftCode?: string;

  bankDebitAdviceFileName?: string;
  bankDebitAdviceFilePath?: string;

  paymentStatus: 'settled';

  remarks: string;
  status: 'active'|'in-active';

  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true, index: true },

    purchaseOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: true,
      index: true,
    },

    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },

    transactionId: { type: String, required: true, index: true },

    referenceNo: String,
    referenceDate: Date,

    invoiceNumber: [{ type: String }],
    creditNoteNumber: [{ type: String }],

    paymentDate: Date,
    paymentCurrency: String,

    grossPaymentAmount: Number,
    taxDeduction: Number,
    actualPaymentAmount: Number,

    bankSwiftCode: String,

    bankDebitAdviceFileName: String,
    bankDebitAdviceFilePath: String,

    paymentStatus: {
      type: String,
      enum: ['settled'],
      default: 'settled',
    },

    remarks: String,

    status: {
      type: String,
      enum: ['active', 'in-active'],
      default: 'active',
    },
  },
  { timestamps: true }
);

/**
 * 🔥 Optimized Index
 */
paymentSchema.index({ organizationId: 1, vendorId: 1, status: 1 });

export default model<IPayment>('Payment', paymentSchema);