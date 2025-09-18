/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

// designation.model.ts
import { Schema, model, Document, Types } from 'mongoose';

// Define Designation interface
interface IDesignation extends Document {
  organizationId: Types.ObjectId;
  departmentId: Types.ObjectId;
  name: string;
  description?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define Designation Schema
const designationSchema = new Schema<IDesignation>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    name: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

const Designation = model<IDesignation>('Designation', designationSchema);

export default Designation;
