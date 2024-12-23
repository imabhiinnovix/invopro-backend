import { Schema, model, Document, Types } from 'mongoose';

enum UserRole {
  SUPER_ADMIN = 'super admin',
  ADMIN = 'admin',
  USER = 'user',
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  role?: string;
  roleId?: string;
  lastSearchHistoryId: Types.ObjectId;
  organizationId: Types.ObjectId;
  lastLogin?: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    status: { type: String, default: 'inactive' }, // 1. active, 2. inactive
    role: {
      type: String,
      required: true,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    roleId: {
      type: Number,
      required: true,
      default: 3, // 1 for Super Admin, 2 for Admin, 3 for User
    },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    lastLogin: { type: Date, default: null }, // New field to track last login time
  },
  {
    timestamps: true,
  },
);

export default model<IUser>('User', userSchema);
