import { Schema, model, Document, Types } from 'mongoose';

// Interface for the document
export interface IOrganizationProductSubscription extends Document {
  organizationId: Types.ObjectId;
  productId: Types.ObjectId;
  status: 'active' | 'inactive';
  totalLicenses: number;
  licenseExpiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema
const organizationProductSubscriptionSchema = new Schema<IOrganizationProductSubscription>(
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
organizationProductSubscriptionSchema.index({ organizationId: 1, productId: 1 }, { unique: true });

const OrganizationProductSubscription = model<IOrganizationProductSubscription>(
  'organization_product_subscription',
  organizationProductSubscriptionSchema
);

export default OrganizationProductSubscription;
