import { Schema, model, Document, Types } from 'mongoose';

export interface IPermission extends Document {
  name: string;
  resource: string;
  productId: Types.ObjectId;
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
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'product',
    },
  },
  {
    timestamps: true,
  }
);

// Export model
const Permission = model<IPermission>('permission', permissionSchema);
export default Permission;
