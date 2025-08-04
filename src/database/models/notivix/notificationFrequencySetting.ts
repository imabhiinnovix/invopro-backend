import { Schema, model, Types, Document } from 'mongoose';

// Interface: NotificationRecipient
interface INotificationRecipient {
  attributeId: Types.ObjectId;
  referenceAttributeId: Types.ObjectId;
}

// Interface: NotificationFrequencySetting
export interface INotificationFrequencySetting extends Document {
  organizationId: Types.ObjectId;
  userId?: Types.ObjectId;
  notificationTypeId: Types.ObjectId;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
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
  recipients: INotificationRecipient[];
  medium: Types.ObjectId;
  templateId: Types.ObjectId;
}

// Embedded Schema: NotificationRecipient
const notificationRecipientSchema = new Schema<INotificationRecipient>(
  {
    attributeId: { type: Schema.Types.ObjectId, required: true },
    referenceAttributeId: { type: Schema.Types.ObjectId },
  },
  { _id: false }
);

// Main Schema: NotificationFrequencySetting
const notificationFrequencySettingSchema = new Schema<INotificationFrequencySetting>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    notificationTypeId: { type: Schema.Types.ObjectId, ref: 'notification_type', required: true },

    frequency: { type: String, enum: ['once', 'daily', 'weekly', 'monthly', 'yearly', 'custom'], required: true },
    interval: { type: Number, default: 1 },

    daysOfWeek: { type: [Number], default: [] },         // weekly
    dayOfMonth: { type: [Number], default: [] },         // monthly
    weekOfMonth: { type: [Number], default: [] },        // monthly
    dayOfWeekInMonth: { type: Number },                  // monthly
    monthOfYear: { type: Number },                       // yearly
    dayOfYearMonth: { type: Number },                    // yearly

    repeatAnnually: { type: Boolean, default: false },
    acknowledgeRequired: { type: Boolean, default: false },
    attachmentRequired: { type: Boolean, default: false },
    recipients: { type: [notificationRecipientSchema], default: [] },
    medium: { type: Schema.Types.ObjectId, ref: 'notification_medium_setting', required: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'notification_template', required: true },
  },
  {
    timestamps: true // replaces created_at / updated_at
  }
);

// Optional: Indexes if needed
notificationFrequencySettingSchema.index(
  { notificationTypeId: 1, organizationId: 1 },
  { unique: false }
);

const NotificationFrequencySetting = model<INotificationFrequencySetting>(
  'notification_frequency_setting',
  notificationFrequencySettingSchema
);

export default NotificationFrequencySetting;
