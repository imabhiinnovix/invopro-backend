import { Schema, model, Document, Types } from 'mongoose';

enum DashboardShareStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
}

enum DashboardPermissionLevel {
  VIEWER = 'viewer',
  EDITOR = 'editor',
}

export interface IDashboardShare extends Document {
  _id: Types.ObjectId;
  sharedById: Types.ObjectId;
  sharedWithId: Types.ObjectId;
  dashboardId: Types.ObjectId;
  organizationId: Types.ObjectId;
  permission: DashboardPermissionLevel;
  status: DashboardShareStatus;
}

const dashboardShareSchema = new Schema<IDashboardShare>(
  {
    sharedById: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    sharedWithId: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    dashboardId: { type: Schema.Types.ObjectId, ref: 'dashboard', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    permission: {
      type: String,
      enum: Object.values(DashboardPermissionLevel),
      default: DashboardPermissionLevel.VIEWER,
    },
    status: {
      type: String,
      enum: Object.values(DashboardShareStatus),
      default: DashboardShareStatus.ACCEPTED,
    },
  },
  {
    timestamps: true,
  }
);

dashboardShareSchema.index({ sharedById: 1, sharedWithId: 1, dashboardId: 1 }, { unique: true });

export default model<IDashboardShare>('dashboard_share', dashboardShareSchema);
