// models/notificationAcknowledge.ts
import { Schema, model, Types, Document } from "mongoose";

export interface INotificationAcknowledge extends Document {
  organizationId?: Types.ObjectId;
  addedById?: Types.ObjectId;
  senderId?: Types.ObjectId;
  recipientId?: string; // text in MySQL; can be JSON/string
  identifierKey?: string;
  triggerDate?: Date;
  processingStatus?: number; // tinyint in MySQL
  meta?: any; // optional extra data
  createdAt?: Date;
  updatedAt?: Date;
}

const notificationAcknowledgeSchema = new Schema<INotificationAcknowledge>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
    addedById: { type: Schema.Types.ObjectId, ref: "User", index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User" },

    // Keep as string/text; you may store serialized recipient object if needed
    recipientId: { type: String },

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
notificationAcknowledgeSchema.index({ organizationId: 1, addedById: 1 });
notificationAcknowledgeSchema.index({ preparedNotificationId: 1 });
notificationAcknowledgeSchema.index({ identifierKey: 1 });
notificationAcknowledgeSchema.index({ triggerDate: 1 });

const NotificationAcknowledgeModel = model<INotificationAcknowledge>(
  "notification_acknowledge",
  notificationAcknowledgeSchema
);

export default NotificationAcknowledgeModel;
