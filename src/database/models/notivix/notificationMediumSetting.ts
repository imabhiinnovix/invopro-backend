/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Document, Types } from 'mongoose';

export interface INotificationMediumSetting extends Document {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  medium: 'email' | 'sms' | 'whatsapp' | 'slack' | 'inapp';
  fromAddress?: string;     // for email
  serviceName?: string;     // e.g., "sendgrid", "twilio"
  apiKey?: string;          // secret or token to access service
  enabled?: boolean;
}

const notificationMediumSettingSchema = new Schema<INotificationMediumSetting>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'product',
      required: true,
      index: true,
    },
    medium: {
      type: String,
      enum: ['email', 'sms', 'whatsapp', 'slack', 'inapp'],
      default: 'email'
    },
    fromAddress: {
      type: String,
    },
    serviceName: {
      type: String,
    },
    apiKey: {
      type: String,
    },
    enabled: {
      type: Boolean,
      default: true,
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
