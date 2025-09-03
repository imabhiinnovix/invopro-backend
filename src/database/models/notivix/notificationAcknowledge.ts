// models/notificationAcknowledge.ts
import { Schema, model, Types, Document } from "mongoose";


export interface IPreparedRecipient {
  recipient_to?: string[]; // final resolved "to" recipients
  recipient_cc?: string[]; // final resolved "cc" recipients
}

export interface INotificationAcknowledge extends Document {
  organizationId?: Types.ObjectId;
  userId?: Types.ObjectId;
  notificationTriggerId?: Types.ObjectId;
  senderId?: string;
  recipients?: IPreparedRecipient; // text in MySQL; can be JSON/string
  identifierKey?: string;
  triggerDate?: Date;
  processingStatus?: number; // tinyint in MySQL
  meta?: any; // optional extra data
  createdAt?: Date;
  updatedAt?: Date;
}

const preparedRecipientSchema = new Schema<IPreparedRecipient>(
  {
    recipient_to: { type: [String], default: [] },
    recipient_cc: { type: [String], default: [] },
  },
  { _id: false }
);

const notificationAcknowledgeSchema = new Schema<INotificationAcknowledge>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    notificationTriggerId: { type: Schema.Types.ObjectId, ref: "notification_trigger", index: true },
    senderId: { type: String },

    // Keep as string/text; you may store serialized recipient object if needed
    recipients: { type: preparedRecipientSchema, default: {} },

    identifierKey: { type: String }, // an external/business identifier
    triggerDate: { type: Date },
    processingStatus: { type: Number, default: 1 },

    // optional generic metadata (e.g. ack payload, channel details)
    meta: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

/* Indexes: add commonly queried combos */
notificationAcknowledgeSchema.index({ organizationId: 1, userId: 1 });
notificationAcknowledgeSchema.index({ preparedNotificationId: 1 });
notificationAcknowledgeSchema.index({ identifierKey: 1 });
notificationAcknowledgeSchema.index({ triggerDate: 1 });

const NotificationAcknowledgeModel = model<INotificationAcknowledge>(
  "notification_acknowledge",
  notificationAcknowledgeSchema
);

export default NotificationAcknowledgeModel;
