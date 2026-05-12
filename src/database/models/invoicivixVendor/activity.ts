/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema, model, Document, Types } from 'mongoose';

export interface IActivity extends Document {
  organizationId: Types.ObjectId;

  activityType: 'mailbox' | 'action' | 'disclosure' | 'portfolio';

  versionValue: string; // e.g. 2026-03

  activityFileName?: string;
  activityFilePath?: string;

  analyze_processing_status: 'pending' | 'processing' | 'processed';

  status: 'active' | 'inactive';

  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    activityType: {
      type: String,
      enum: ['mailbox', 'action', 'disclosure', 'portfolio'],
      required: true,
      index: true,
    },

    versionValue: {
      type: String,
      required: true,
      trim: true,
    },

    activityFileName: {
      type: String,
      default: '',
      trim: true,
    },

    activityFilePath: {
      type: String,
      default: '',
      trim: true,
    },

    analyze_processing_status: {
      type: String,
      enum: ['pending', 'processing', 'processed'],
      default: 'pending',
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);

/**
 * Unique constraint:
 * One activity per org + type + version
 */
// activitySchema.index(
//   { organizationId: 1, activityType: 1, versionValue: 1 },
//   { unique: true }
// );

const Activity = model<IActivity>('Activity', activitySchema);

export default Activity;