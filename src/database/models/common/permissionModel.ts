import { Schema, model, Document, Types } from 'mongoose';
import DataSource from '../reportivix/dataSource';

export interface IPermission extends Document {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; // You can extend this if needed
  resourceId: string;
  productId: Types.ObjectId;
  extraOptions?: Record<string, any>;
  status: 'active' | 'inactive';
  resourceType: string;
  createdAt: Date;
  updatedAt: Date;
  isSuperUser: boolean;
  organizationId: Types.ObjectId;
  dataSourceId: Types.ObjectId;
  resourceCode: string;
  menuName: string;
}

// Define schema
const permissionSchema = new Schema<IPermission>(
  {
    name: {
      type: String,
      required: true,
    },
    menuName: { type: String },
    method: {
      type: String,
      required: true,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // extend if needed
    },
    resourceId: {
      type: String,
      required: true,
    },
    dataSourceId: {
      type: Schema.Types.ObjectId,
      ref: 'data_source',
    },
    resourceType: {
      type: String,
      required: true,
    },
    resourceCode: {
      type: String,
      // required: true,
    },
    extraOptions: {
      type: Object,
      default: {},
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
    isSuperUser: {
      type: Boolean,
      default: false,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
  },
  {
    timestamps: true,
  }
);

// Add compound unique index on method + resource
// permissionSchema.index({ method: 1, resourceId: 1, dataSourceId: 1 }, { unique: true });

// Export model
const Permission = model<IPermission>('permission', permissionSchema);
export default Permission;
