/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Types, Document } from 'mongoose';

interface IAttachmentField {
  type: 'excel' | 'pdf' | 'image';
  fileName: string;
  fieldList?: {
    attributeId: Types.ObjectId;
    refAttributeId?: Types.ObjectId[];
  }[];
  filePath?: string;
}

export interface IGroupByItem {
  attributeId: Types.ObjectId;
  refAttributeId?: Types.ObjectId[];
}

export interface INotificationTemplate extends Document {
  organizationId?: Types.ObjectId | null;
  userId?: Types.ObjectId;
  dataSourceId: Types.ObjectId;
  name: string;
  code: string;
  subject: string;
  body: string;
  type: 'single' | 'overall';
  groupBy?: IGroupByItem[];
  attachmentSettings?: IAttachmentField[];
  status: 'active' | 'in-active';
}

const attachmentFieldSchema = new Schema<IAttachmentField>(
  {
    type: {
      type: String,
      enum: ['excel', 'pdf', 'image'],
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fieldList: {
      type: [
        {
          attributeId: { type: Schema.Types.ObjectId, required: true },
          refAttributeId: { type: [Schema.Types.ObjectId], default: [] },
        },
      ],
      default: [],
    },
    filePath: {
      type: String,
    },
  },
  { _id: false }
);

const groupByItemSchema = new Schema<IGroupByItem>(
  {
    attributeId: { type: Schema.Types.ObjectId, required: true },
    refAttributeId: { type: [Schema.Types.ObjectId], default: [] },
  },
  { _id: false }
);

const notificationTemplateSchema = new Schema<INotificationTemplate>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'user' },
    dataSourceId: {
      type: Schema.Types.ObjectId,
      ref: "data_source",
      required: true
    },
    name: { type: String, required: true },
    code: { type: String, unique: true, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    type: {
      type: String,
      enum: ['single', 'overall'],
      default: 'single',
    },
    groupBy: {
      type: [groupByItemSchema],
      default: [],
    },
    attachmentSettings: {
      type: [attachmentFieldSchema],
      default: [],
    },
    status: { type: String, enum: ["active", "in-active"], default: "active" },
  },
  {
    timestamps: true,
  }
);

// Compound unique index for (entityId + code)
notificationTemplateSchema.index({ entityId: 1, code: 1 }, { unique: true });

export default model<INotificationTemplate>('notification_template', notificationTemplateSchema);