/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema, model, Document, Types } from 'mongoose';

export interface IPurchaseOrder extends Document {
  organizationId: Types.ObjectId;

  poNumber: string;
  poDate?: Date;

  poValue: number;
  poCurrency?: string;

  balance_po_amount?: number; // 🔥 Remaining amount

  vendorId: Types.ObjectId;

  entityCode?: string;
  entityName?: string;
  entityAddress?: string;

  poCreatedBy?: string;
  poCreationDate?: Date;

  poApprovedBy?: string;
  poApprovedDate?: Date;

  billingEntityName?: string;
  billingEntityAddress?: string;
  billingEntityTaxId?: string;

  remarks?: string;

  status: string;

  createdAt: Date;
  updatedAt: Date;
}

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    poNumber: {
      type: String,
      required: true,
      index: true,
    },

    poDate: Date,

    poValue: {
      type: Number,
      required: true,
    },

    poCurrency: String,

    balance_po_amount: {
      type: Number,
      default: 0,
    },

    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },

    entityCode: String,
    entityName: String,
    entityAddress: String,

    poCreatedBy: String,
    poCreationDate: Date,

    poApprovedBy: String,
    poApprovedDate: Date,

    billingEntityName: String,
    billingEntityAddress: String,
    billingEntityTaxId: String,

    remarks: String,

    status: {
      type: String,
      default: 'active',
    },
  },
  { timestamps: true }
);

/**
 * 🔥 Indexes
 */
purchaseOrderSchema.index({ organizationId: 1, vendorId: 1 });
purchaseOrderSchema.index({ organizationId: 1, poNumber: 1 });

export default model<IPurchaseOrder>('PurchaseOrder', purchaseOrderSchema);