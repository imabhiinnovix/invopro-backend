/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Document, Types } from 'mongoose';

export interface IEngagementLetter extends Document {
  organizationId: Types.ObjectId;
  vendorId: Types.ObjectId;

  referenceNumber: string;

  startDate?: Date;
  endDate?: Date;

  engagementLetterFileName?: string;
  engagementLetterFilePath?: string;

  status: 'active' | 'expired' | 'terminated';

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

    status: {
      type: String,
      enum: ['active', 'expired', 'terminated'],
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