import { Schema, model, Document, Types } from 'mongoose';

export interface IRoleHasPermission extends Document {
  permissionId: Types.ObjectId;
  roleId: Types.ObjectId;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
  statusName?: string;
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
  },
  {
    timestamps: true,
  }
);

// Export model
const RoleHasPermission = model<IRoleHasPermission>('role_has_permission', roleHasPermissionSchema);

export default RoleHasPermission;
