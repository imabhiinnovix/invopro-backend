// models/notificationTrigger.ts
import { Schema, model, Types, Document } from "mongoose";

export type NotificationTriggerSource = "cron" | "web" | "command";

export interface INotificationTrigger extends Document {
  organizationId?: Types.ObjectId;
  userId?: Types.ObjectId;                 
  source?: NotificationTriggerSource;
  isDryRun?: boolean;
  simulationDate?: Date;
  actionsLastUploadedDate?: Date;    
  createdAt?: Date;
  updatedAt?: Date;
}

const notificationTriggerSchema = new Schema<INotificationTrigger>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },

    // who initiated the trigger
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },

    // source of trigger
    source: { type: String, enum: ["cron", "web", "command"], default: "web", index: true },

    // if this run was simulated (no side-effects, just prepare + preview)
    isDryRun: { type: Boolean, default: false },

    // optional: logical date for simulation/runs
    simulationDate: { type: Date, index: true },

    // link to data source version used for this trigger
    actionsLastUploadedDate: { type: Date },
  },
  {
    timestamps: true,
    collection: "notification_trigger",
  }
);

/* Useful indexes */
notificationTriggerSchema.index({ organizationId: 1, createdAt: -1 });
notificationTriggerSchema.index({ source: 1, createdAt: -1 });
notificationTriggerSchema.index({ dataSourceVersionId: 1 });

const NotificationTriggerModel = model<INotificationTrigger>(
  "notification_trigger",
  notificationTriggerSchema
);

export default NotificationTriggerModel;
