/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Document, Types } from 'mongoose';

interface IDataSourceVersion extends Document {
  organizationId: Types.ObjectId;
  vendorId: Types.ObjectId | null;
  dataSourceId: Types.ObjectId;
  entityId: Types.ObjectId;
  customReportId: Types.ObjectId;
  reportRequestId: Types.ObjectId;
  versionValue: string;
  filePath: string;
  fileType: string;
  fileSize: string;
  updatedBy?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  isActive: boolean;
  versionName: string;
  isCurrent: boolean;
  status: 'failed' | 'processing' | 'completed' | 'partially-completed' | 'discarded';
  aiStatus:
  | 'pending'
  | 'extracting'
  | 'validating'
  | 'analyst-review'
  | 'revalidation-needed'
  | 'approved'
  | 'paid'
  | 'rate-violation'
  | 'failed';
  fileName: string;
  mappings: Record<string, string>;
  separator: Record<string, string>;
}

const dataSourceVersionSchema = new Schema<IDataSourceVersion>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    dataSourceId: { type: Schema.Types.ObjectId, ref: 'data_source' },
    entityId: { type: Schema.Types.ObjectId, ref: 'Entity' },
    versionValue: { type: String, required: true },
    versionName: { type: String },
    customReportId: { type: Schema.Types.ObjectId, ref: 'custom_reports' },
    reportRequestId: { type: Schema.Types.ObjectId, ref: 'report_requests' },
    status: {
      type: String,
      enum: ['failed', 'processing', 'completed', 'partially-completed', 'discarded'], // Restricting the values of status
      required: true,
      default: 'processing', // Optional: Default value for status
    },

    aiStatus: {
      type: String,
      enum: [
        'pending',
        'extracting',
        'validating',
        'analyst-review',
        'revalidation-needed',
        'approved',
        'paid',
        'rate-violation',
        'failed'
      ],
      default: 'pending'
    },
    mappings: { type: Schema.Types.Mixed },
    separator: {
      type: Map, // Mongoose's Map type to store key-value pairs
      of: String, // The values in the map are strings
      default: {}, // Optional: Default to an empty map if no mappings are provided
    },
    fileName: { type: String },
    filePath: { type: String },
    fileType: { type: String },
    fileSize: { type: String },
    isCurrent: { type: Boolean, required: true },
    isActive: { type: Boolean, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'user' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'user' },
  },
  {
    timestamps: true,
  }
);

dataSourceVersionSchema.index(
  { dataSourceId: 1, versionValue: 1, isCurrent: 1 },
  { collation: { locale: 'en', strength: 2 } }
);

const DataSourceVersion = model<IDataSourceVersion>('data_source_version', dataSourceVersionSchema);

export default DataSourceVersion;
