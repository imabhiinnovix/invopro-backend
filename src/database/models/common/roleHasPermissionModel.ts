/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Document, Types } from 'mongoose';

export interface IRoleHasPermission extends Document {
  permissionId: Types.ObjectId;
  roleId: Types.ObjectId;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
  statusName?: string;
  isChangeable: boolean;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
}

// Define schema
const roleHasPermissionSchema = new Schema<IRoleHasPermission>(
  {
    permissionId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'permission',
    },
    roleId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'user_role',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    isChangeable: {
      type: Boolean,
      default: true,
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
  {
    timestamps: true,
  }
);

// Export model
const RoleHasPermission = model<IRoleHasPermission>('role_has_permission', roleHasPermissionSchema);

export default RoleHasPermission;
