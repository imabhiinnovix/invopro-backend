import { Schema, model, Document, Types } from 'mongoose';

enum ShareStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
}

enum PermissionLevel {
  VIEWER = 'viewer',
  EDITOR = 'editor',
}

export interface ITransferDashboard extends Document {
  _id: Types.ObjectId;
  senderUserId: Types.ObjectId;
  receiverUserId: Types.ObjectId;
  dashboardId: Types.ObjectId;
  organizationId: Types.ObjectId;
  permission: PermissionLevel;
  status: ShareStatus;
}

const transferDashboardSchema = new Schema<ITransferDashboard>(
  {
    senderUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiverUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dashboardId: { type: Schema.Types.ObjectId, ref: 'dashboard', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    permission: {
      type: String,
      enum: Object.values(PermissionLevel),
      default: PermissionLevel.VIEWER,
    },
    status: {
      type: String,
      enum: Object.values(ShareStatus),
      default: ShareStatus.ACCEPTED,
    },
  },
  {
    timestamps: true,
  }
);

transferDashboardSchema.index({ senderUserId: 1, receiverUserId: 1, dashboardId: 1 }, { unique: true });

export default model<ITransferDashboard>('transfer_dashboard', transferDashboardSchema);
