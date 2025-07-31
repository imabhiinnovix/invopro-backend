import { Schema, model, Types, Document } from 'mongoose';

export interface INotificationMediumSetting extends Document {
  frequencySettingId: Types.ObjectId;
  medium: 'email' | 'sms' | 'whatsapp' | 'slack' | 'inapp';
  templateId: Types.ObjectId;
  enabled?: boolean;
}

const notificationMediumSettingSchema = new Schema<INotificationMediumSetting>(
  {
    frequencySettingId: {
      type: Schema.Types.ObjectId,
      ref: 'notification_frequency_setting',
      required: true,
    },
    medium: {
      type: String,
      enum: ['email', 'sms', 'whatsapp', 'slack', 'inapp'],
      required: true,
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'NotificationTemplate',
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

export default model<INotificationMediumSetting>('notification_medium_setting', notificationMediumSettingSchema);
