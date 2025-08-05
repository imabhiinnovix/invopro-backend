import { Schema, model, Document, Types } from 'mongoose';

interface MediumSetting {
  medium: 'email' | 'sms' | 'whatsapp' | 'slack' | 'inapp';
  fromAddress?: string;     // for email
  serviceName?: string;     // e.g., "sendgrid", "twilio"
  apiKey?: string;          // secret or token to access service
  enabled?: boolean;
}

export interface INotificationMediumSetting extends Document {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  mediumSettings: MediumSetting[];
}

const mediumSettingSchema = new Schema<MediumSetting>(
  {
    medium: {
      type: String,
      enum: ['email', 'sms', 'whatsapp', 'slack', 'inapp'],
      required: true,
    },
    fromAddress: String,
    serviceName: String,
    apiKey: String,
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false } // prevent creating subdocument _id for each setting
);

const notificationMediumSettingSchema = new Schema<INotificationMediumSetting>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'product',
      required: true,
      index: true,
    },
    mediumSettings: {
      type: [mediumSettingSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);


export default model<INotificationMediumSetting>(
  'notification_medium_setting',
  notificationMediumSettingSchema
);