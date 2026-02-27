/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Document, Types } from 'mongoose';

export interface IEngagementLetter extends Document {
  organizationId: Types.ObjectId;
  vendorId: Types.ObjectId;

  referenceNumber: string;

  description?: string;

  startDate?: Date;
  endDate?: Date;

  engagementLetterFileName?: string;
  engagementLetterFilePath?: string;

  engagementLetterStatus: 'in-force' | 'expired';

  status: 'active' | 'inactive';

  createdAt: Date;
  updatedAt: Date;
}

const engagementLetterSchema = new Schema<IEngagementLetter>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },

    referenceNumber: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
    },

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    engagementLetterFileName: {
      type: String,
      trim: true,
      default: '',
    },

    engagementLetterFilePath: {
      type: String,
      trim: true,
      default: '',
    },

    engagementLetterStatus:{
      type: String,
      enum: ['in-force', 'expired'],
      default: 'in-force',
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * One reference number should be unique per organization
 */
engagementLetterSchema.index(
  { organizationId: 1, referenceNumber: 1 },
  { unique: true }
);

/**
 * Fast lookup: vendor engagement
 */
engagementLetterSchema.index({
  vendorId: 1,
  status: 1,
});

const EngagementLetter = model<IEngagementLetter>(
  'EngagementLetter',
  engagementLetterSchema
);

export default EngagementLetter;