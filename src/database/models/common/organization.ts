/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

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

  // New fields
  logo?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  gst?: string;
  pan?: string;
  businessUnitCode?: string;
  allowedDomains?: string[];
  activatePasswordOTP?: boolean;
}

// Define the Organization Schema
const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true },
    description: { type: String },
    owner: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    domain: { type: String },
    code: { type: String, required: true, unique: true },
    isMaster: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },

    // New fields
    logo: { type: String, default: '' },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    address1: { type: String, default: '' },
    address2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zip: { type: String, default: '' },
    country: { type: String, default: '' },
    gst: { type: String, default: '' },
    pan: { type: String, default: '' },
    businessUnitCode: { type: String, default: '' },
    allowedDomains: { type: [String], default: []},
    activatePasswordOTP: { type: Boolean, default: false }
  },
  {
    timestamps: true,
  }
);

const Organization = model<IOrganization>('Organization', organizationSchema);

export default Organization;