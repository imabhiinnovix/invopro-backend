/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema, model, Document, Types } from 'mongoose';

export interface IVendorAttorney extends Document {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  vendorId: Types.ObjectId;

  name: string;
  code: string;
  userType: string;
  status: string;

  createdAt: Date;
  updatedAt: Date;
}

const vendorAttorneySchema = new Schema<IVendorAttorney>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },

    name: { type: String, required: true },
    code: { type: String, required: true, trim: true },
    userType: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

vendorAttorneySchema.index({ organizationId: 1, name: 1 });
vendorAttorneySchema.index({ organizationId: 1, code: 1 });

const VendorAttorney = model<IVendorAttorney>('VendorAttorney', vendorAttorneySchema);

export default VendorAttorney;