import { Schema, model, Document, Types } from 'mongoose';

export interface IUserRole extends Document {
  organizationId: Types.ObjectId;
  name: string;
  isSuperUser: boolean;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'inactive';
}

const userRoleSchema = new Schema<IUserRole>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'organization',
    },
    name: {
      type: String,
      required: true,
    },
    isSuperUser: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'user',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'user',
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

userRoleSchema.index({ organizationId: 1, name: 1 }, { unique: true });
// Export model
const UserRole = model<IUserRole>('user_role', userRoleSchema);
export default UserRole;
