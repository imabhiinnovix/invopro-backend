// organization.model.ts
import { Schema, model, Document, Types } from 'mongoose';

// Define the Organization interface
interface IOrganization extends Document {
  name: string;
  description?: string;
  owner: Types.ObjectId;
  isMaster: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  domain: string;
  code: string;
}

// Define the Organization Schema
const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true },
    description: { type: String },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    domain: { type: String },
    code: { type: String, required: true, unique: true },
    isMaster: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

const Organization = model<IOrganization>('Organization', organizationSchema);

export default Organization;
