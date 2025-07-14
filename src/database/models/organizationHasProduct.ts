import { Schema, model, Document, Types } from 'mongoose';

// Interface for the document
export interface IOrganizationHasProduct extends Document {
  organizationId: Types.ObjectId;
  productId: Types.ObjectId;
  status: 'active' | 'inactive';
  totalLicenses: number;
  licenseExpiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema
const organizationHasProductSchema = new Schema<IOrganizationHasProduct>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'organization',
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'product',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    totalLicenses: { type: Number, default: 0 },
    licenseExpiresAt: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

// Composite unique index to prevent duplicate entries
organizationHasProductSchema.index({ organizationId: 1, productId: 1 }, { unique: true });

// Export the model
export const OrganizationHasProduct = model<IOrganizationHasProduct>(
  'organization_has_product',
  organizationHasProductSchema
);
