/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Document, Types } from 'mongoose';

export interface IRoleDefaultDashboard extends Document {
  organizationId: Types.ObjectId;
  roleId: Types.ObjectId;
  dashboardId: Types.ObjectId;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
}

const roleDefaultDashboardSchema = new Schema<IRoleDefaultDashboard>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: 'user_role',
      required: true,
    },
    dashboardId: {
      type: Schema.Types.ObjectId,
      ref: 'dashboard',
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'user',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'user',
    },
  },
  { timestamps: true }
);

// One default dashboard per role per organization
roleDefaultDashboardSchema.index(
  { organizationId: 1, roleId: 1 },
  { unique: true }
);

export default model<IRoleDefaultDashboard>(
  'role_default_dashboard',
  roleDefaultDashboardSchema
);