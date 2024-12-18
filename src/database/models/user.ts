import { Schema, model, Document, Types } from 'mongoose';

interface IRPDimensions {
  width: string;
  height: string;
}

interface ISetting {
  RPPos: string;
  RPDimensions: {
    left: IRPDimensions;
    right: IRPDimensions;
    bottom: IRPDimensions;
    top: IRPDimensions;
  };
  showOccurrenceCount: boolean;
  showOccurrenceCountTerm: boolean;
  proximityRange: number;
}

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
  lastWorkspaceId: Types.ObjectId;
  lastSearchHistoryId: Types.ObjectId;
  organizationId: Types.ObjectId;
  settings?: ISetting;
  lastLogin?: Date;
}

const RPDimensionsSchema = new Schema<IRPDimensions>({
  width: { type: String },
  height: { type: String },
});

const settingSchema = new Schema<ISetting>({
  RPPos: { type: String, default: 'top' },
  RPDimensions: {
    left: { type: RPDimensionsSchema },
    right: { type: RPDimensionsSchema },
    bottom: { type: RPDimensionsSchema },
    top: { type: RPDimensionsSchema },
  },
  showOccurrenceCount: { type: Boolean, default: true },
  showOccurrenceCountTerm: { type: Boolean, default: true },
  proximityRange: { type: Number, default: 100 },
});

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
    lastWorkspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace' },
    lastSearchHistoryId: { type: Schema.Types.ObjectId, ref: 'SearchHistory' },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    lastLogin: { type: Date, default: null }, // New field to track last login time
    settings: {
      type: settingSchema,
      default: {
        RPPos: 'top',
        RPDimensions: {
          left: { width: '30%', height: '100%' },
          right: { width: '30%', height: '100%' },
          bottom: { width: '100%', height: '30%' },
          top: { width: '100%', height: '30%' },
        },
        showOccurrenceCount: true,
        showOccurrenceCountTerm: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

export default model<IUser>('User', userSchema);
