/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Types, Document } from "mongoose";

// -------------------
// Interfaces
// -------------------
interface INotificationCondition {
  attributeId: Types.ObjectId;
  refAttributeId?: Types.ObjectId[];
  operator: string;
  timeUnit: string;
  value?: string;
}

interface INotificationConditionGroup {
  group_operator: "AND" | "OR";
  conditions: (INotificationCondition | INotificationConditionGroup)[];
}

export interface INotificationType extends Document {
  organizationId: Types.ObjectId;
  userId?: Types.ObjectId;
  name: string;
  dataSourceId: Types.ObjectId;
  status: "active" | "inactive";
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  conditionGroups: INotificationConditionGroup[];
  summary: string;
}

// -------------------
// Recursive Schema
// -------------------

// Step 1: Define the base schema without "conditions" so we can reference it later
const conditionOrGroupSchema = new Schema<any>(
  {
    attributeId: { type: Schema.Types.ObjectId },
    refAttributeId: {
      type: [Schema.Types.ObjectId],
      default: [], // Always an array, even for single level
    },
    operator: { type: String },
    value: { type: String },
    timeUnit: { type: String },
    group_operator: { type: String, enum: ["AND", "OR"] },
  },
  { _id: false }
);

// Step 2: Add conditions array recursively
conditionOrGroupSchema.add({
  conditions: {
    type: [conditionOrGroupSchema],
    default: []
  }
});

// -------------------
// Main NotificationType schema
// -------------------
const notificationTypeSchema = new Schema<INotificationType>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true,},
    name: { type: String, required: true },
    dataSourceId: {
      type: Schema.Types.ObjectId,
      ref: "data_source",
      required: true
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    conditionGroups: {
      type: [conditionOrGroupSchema],
      default: [],
    },
    summary: { type: String }
  },
  { timestamps: true }
);

notificationTypeSchema.index(
  { name: 1, organizationId: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

const NotificationType = model<INotificationType>(
  "notification_type",
  notificationTypeSchema
);

export default NotificationType;