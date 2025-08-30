// models/preparedNotification.ts
import { Schema, model, Types, Document } from "mongoose";

export type PreparedStatus =
  | "pending"
  | "processing"
  | "sent"
  | "failed"
  | "cancelled"
  | "acknowledged";

export interface IPreparedRecipient {
  recipient_to?: string[]; // final resolved "to" recipients
  recipient_cc?: string[]; // final resolved "cc" recipients
}

export interface IPreparedNotification extends Document {
  organizationId: Types.ObjectId;
  notificationTypeId?: Types.ObjectId;
  frequencySettingId: Types.ObjectId;
  templateId?: Types.ObjectId;
  mediumSettingId?: Types.ObjectId;

  scheduledAt: Date;
  timezone?: string;

  payload?: any;
  recipients: IPreparedRecipient[];

  attachmentPaths?: { filePath: string; fileName?: string }[];

  status: PreparedStatus;
  attempts: number;
  maxAttempts?: number;
  lastAttemptAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  error?: any;

  lockedAt?: Date;
  lockedBy?: string;

  priority?: number;
  createdBy?: Types.ObjectId;
  meta?: any;

  acknowledgeId?: Types.ObjectId;
  notificationTriggerId?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
  ttlDate?: Date;
}

const preparedRecipientSchema = new Schema<IPreparedRecipient>(
  {
    recipient_to: { type: [String], default: [] },
    recipient_cc: { type: [String], default: [] },
  },
  { _id: false }
);

const attachmentPathSchema = new Schema(
  {
    filePath: { type: String, required: true },
    fileName: { type: String },
  },
  { _id: false }
);

const preparedNotificationSchema = new Schema<IPreparedNotification>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },

    notificationTypeId: { type: Schema.Types.ObjectId, ref: "notification_type" },
    frequencySettingId: {
      type: Schema.Types.ObjectId,
      ref: "notification_frequency_setting",
      required: true,
    },
    templateId: { type: Schema.Types.ObjectId, ref: "notification_template" },
    mediumSettingId: { type: Schema.Types.ObjectId, ref: "notification_medium_setting" },

    scheduledAt: { type: Date, required: true },
    timezone: { type: String },
    notificationTriggerId: { type: Schema.Types.ObjectId, ref: "notification_trigger", index: true },

    payload: { type: Schema.Types.Mixed, default: {} },

    recipients: { type: [preparedRecipientSchema], default: [] },

    attachmentPaths: { type: [attachmentPathSchema], default: [] },

    status: {
      type: String,
      enum: ["pending", "processing", "sent", "failed", "cancelled", "acknowledged"],
      default: "pending",
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    lastAttemptAt: { type: Date },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    error: { type: Schema.Types.Mixed },

    lockedAt: { type: Date },
    lockedBy: { type: String },

    priority: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    meta: { type: Schema.Types.Mixed },

    acknowledgeId: { type: Schema.Types.ObjectId, ref: "notification_acknowledge" },

    ttlDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

/* Indexes */
preparedNotificationSchema.index({ scheduledAt: 1, status: 1 });
preparedNotificationSchema.index({ organizationId: 1, status: 1, scheduledAt: 1 });
preparedNotificationSchema.index({ notificationTriggerId: 1, status: 1 });

const PreparedNotificationModel = model<IPreparedNotification>(
  "prepared_notification",
  preparedNotificationSchema
);

export default PreparedNotificationModel;