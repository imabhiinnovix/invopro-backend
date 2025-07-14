import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  email: string;
  password: string;
  roleId?: Types.ObjectId;
  firstName: string;
  lastName?: string;
  mobile?: number;
  isVerified: boolean;
  status: 'active' | 'inactive';
  productIds?: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: 'organization',
    },
    email: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 7,
      trim: true,
      select: false,
    },
    roleId: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: 'user_role',
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: false,
    },
    mobile: {
      type: Number,
      required: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    productIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'product',
      },
    ],
  },
  {
    timestamps: true,
  }
);

const User = model<IUser>('user', userSchema);
export default User;
