/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Document, Types } from 'mongoose';

interface ICentralFile extends Document {
  organizationId: Types.ObjectId;
  reportId: Types.ObjectId;
  dataSourceId: Types.ObjectId; // ✅ Custom Report ID instead of category
  entityId: Types.ObjectId;
  year: number;
  month: number;

  originalFileName: string;
  storedFileName: string;

  version: number;
  isLatest: boolean;

  filePath: string;
  fileType: string;
  fileSize: number;

  validationStatus: 'pending' | 'processing' | 'mapping' | 'error' | 'validated' | 'failed';

  mapping?: Record<string, any>;
  separator?: Record<string, string>;

  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
}

const centralFileSchema = new Schema<ICentralFile>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },

    reportId: { type: Schema.Types.ObjectId, ref: 'custom_reports', default: null },

    dataSourceId: { type: Schema.Types.ObjectId, ref: 'data_source' },

    entityId: { type: Schema.Types.ObjectId, ref: 'Entity' },

    year: { type: Number, required: true },
    month: { type: Number, required: true },

    originalFileName: { type: String, required: true },
    storedFileName: { type: String, required: true },

    version: { type: Number, default: 1 },
    isLatest: { type: Boolean, default: true },

    filePath: { type: String, required: true },
    fileType: { type: String },
    fileSize: { type: Number },

    mapping: { type: Schema.Types.Mixed },
    separator: { type: Schema.Types.Mixed },

    validationStatus: {
      type: String,
      enum: ['pending', 'processing', 'mapping', 'error', 'validated', 'failed'],
      default: 'pending',
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'user' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'user' },
  },
  { timestamps: true }
);

// ✅ Index for fast lookup
centralFileSchema.index({
  organizationId: 1,
  dataSourceId: 1,
  year: 1,
  month: 1,
  originalFileName: 1,
  isLatest: 1,
});

const CentralFile = model<ICentralFile>('central_file', centralFileSchema);

export default CentralFile;