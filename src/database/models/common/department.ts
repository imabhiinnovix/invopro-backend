/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

// department.model.ts
import { Schema, model, Document, Types } from 'mongoose';

// Define Department interface
interface IDepartment extends Document {
  organizationId: Types.ObjectId;
  name: string;
  description?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define Department Schema
const departmentSchema = new Schema<IDepartment>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, unique: true },
    description: { type: String },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

const Department = model<IDepartment>('Department', departmentSchema);

export default Department;
