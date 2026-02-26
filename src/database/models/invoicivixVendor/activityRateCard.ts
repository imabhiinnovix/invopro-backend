/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Document, Types } from 'mongoose';

interface IActivityRateCard extends Document {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  vendorId: Types.ObjectId;

  activityCode: string;     // unique activity code
  costTypeCode: string;     // ATFE / COOF etc.

  rateType: 'hourly' | 'fixed' | 'upper_cap' | 'per_page' | 'per_word';
  rate: number;

  upperCap?: number;

  status: 'active' | 'inactive';

  createdAt: Date;
  updatedAt: Date;
}

const activityRateCardSchema = new Schema<IActivityRateCard>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true,
    },

    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },

    activityCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    costTypeCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    rateType: {
      type: String,
      enum: ['hourly', 'fixed', 'upper_cap', 'per_page', 'per_word'],
      required: true,
    },

    rate: {
      type: Number,
      required: true,
    },

    upperCap: {
      type: Number,
    },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Prevent duplicate rate definitions
 * One vendor + activity + costType should have one active rate
 */
activityRateCardSchema.index(
  { vendorId: 1, activityCode: 1, costTypeCode: 1 },
  { unique: true }
);

/**
 * Fast validation lookup index
 */
activityRateCardSchema.index({
  activityCode: 1,
  costTypeCode: 1,
});

const ActivityRateCard = model<IActivityRateCard>(
  'ActivityRateCard',
  activityRateCardSchema
);

export default ActivityRateCard;