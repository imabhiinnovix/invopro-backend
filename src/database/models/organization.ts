// organization.model.ts
import { Schema, model, Document, Types } from 'mongoose';

// Define the Organization interface
interface IOrganization extends Document {
  name: string;
  description?: string;
  owner: Types.ObjectId;
  isMaster: boolean;
  status: string;
  totalLicenses: number;
  licenseExpiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Define the Organization Schema
const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true },
    description: { type: String },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isMaster: { type: Boolean, default: false },
    status: { type: String, default: 'active' }, // 1. active, 2. inactive
    totalLicenses: { type: Number, default: 0 }, // Total licenses assigned
    licenseExpiresAt: { type: Date, required: true }, // Expiry date for licenses
  },
  {
    timestamps: true,
  }
);

const Organization = model<IOrganization>('Organization', organizationSchema);

export default Organization;
