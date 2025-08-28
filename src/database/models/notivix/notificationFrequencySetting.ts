/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Types, Document } from 'mongoose';

// ----------------------------------
// Interfaces
// ----------------------------------
interface INotificationRecipient {
  attributeId?: Types.ObjectId; // optional if using custom email
  refAttributeId?: Types.ObjectId[];
  customEmails?: string[]; // <-- array of manual/custom emails
}

export interface INotificationFrequencySetting extends Document {
  organizationId: Types.ObjectId;
  userId?: Types.ObjectId;
  notificationTypeId: Types.ObjectId;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number[];
  weekOfMonth?: number[];
  dayOfWeekInMonth?: number;
  monthOfYear?: number;
  dayOfYearMonth?: number;
  repeatAnnually: boolean;
  acknowledgeRequired: boolean;
  attachmentRequired: boolean;
  targetEntity: INotificationRecipient,
  recipients_to: INotificationRecipient[];  // <-- To list
  recipients_cc: INotificationRecipient[];  // <-- CC list
  medium: Types.ObjectId;
  templateId: Types.ObjectId;
  schedulerStartDate?: Date;
  schedulerEndDate?: Date;
  triggerTime?: string;
  maxOccurrences?: number;
  isActive: 'active' | 'in-active';
}

// ----------------------------------
// Embedded Schema: NotificationRecipient
// ----------------------------------
const notificationRecipientSchema = new Schema<INotificationRecipient>(
  {
    attributeId: { type: Schema.Types.ObjectId },
    refAttributeId: { type: [Schema.Types.ObjectId], default: [] },
    customEmails: { type: [String], trim: true, lowercase: true, default: [] } // array of emails
  },
  { _id: false }
);

// ----------------------------------
// Main Schema: NotificationFrequencySetting
// ----------------------------------
const notificationFrequencySettingSchema = new Schema<INotificationFrequencySetting>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    notificationTypeId: { type: Schema.Types.ObjectId, ref: 'notification_type', required: true },

    frequency: { type: String, enum: ['once', 'daily', 'weekly', 'monthly', 'yearly', 'custom'], required: true },
    interval: { type: Number, default: 1 },

    daysOfWeek: { type: [Number], default: [] },
    dayOfMonth: { type: [Number], default: [] },
    weekOfMonth: { type: [Number], default: [] },
    dayOfWeekInMonth: { type: Number },
    monthOfYear: { type: Number },
    dayOfYearMonth: { type: Number },

    repeatAnnually: { type: Boolean, default: false },
    acknowledgeRequired: { type: Boolean, default: false },
    attachmentRequired: { type: Boolean, default: false },
    targetEntity: { type: notificationRecipientSchema },
    recipients_to: { type: [notificationRecipientSchema], default: [] },
    recipients_cc: { type: [notificationRecipientSchema], default: [] },

    medium: { type: Schema.Types.ObjectId, ref: 'notification_medium_setting', required: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'notification_template', required: true },

    schedulerStartDate: { type: Date },
    schedulerEndDate: { type: Date },
    triggerTime: { type: String },
    maxOccurrences: { type: Number, min: 0, default: null },

    isActive: {
      type: String,
      enum: ['active', 'in-active'],
      default: 'active',
    }
  },
  {
    timestamps: true,
  }
);

// Index
notificationFrequencySettingSchema.index(
  { notificationTypeId: 1, organizationId: 1 },
  { unique: false }
);

const NotificationFrequencySetting = model<INotificationFrequencySetting>(
  'notification_frequency_setting',
  notificationFrequencySettingSchema
);

export default NotificationFrequencySetting;