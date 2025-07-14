import { Schema, model, Document } from 'mongoose';

export interface IPermission extends Document {
  name: string;
  resource: string;
  extraOptions?: Record<string, any>;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

// Define schema
const permissionSchema = new Schema<IPermission>(
  {
    name: {
      type: String,
      required: true,
    },
    resource: {
      type: String,
      required: true,
    },
    extraOptions: {
      type: Object,
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
const Permission = model<IPermission>('permission', permissionSchema);
export default Permission;
