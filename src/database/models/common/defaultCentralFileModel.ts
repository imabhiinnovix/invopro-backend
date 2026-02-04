/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, models, connection, Document, Types } from 'mongoose';

interface IDefaultCentralFileValue extends Document {
  centralFileId: Types.ObjectId;          // ⭐ link to central file
  entityId: Types.ObjectId;
  dataSourceId?: Types.ObjectId;          // optional (because central file may exist before datasource version)
  versionValue: string;                   // ex: 2026-01 (year-month)
  rowData: Record<string, any>;
  status: 'active' | 'in-active' | 'invalid';
  createdBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

// Schema
const defaultCentralFileSchema = new Schema<IDefaultCentralFileValue>(
  {
    centralFileId: { type: Schema.Types.ObjectId, ref: 'central_file', required: true },

    entityId: { type: Schema.Types.ObjectId, ref: 'Entity', required: true },

    dataSourceId: { type: Schema.Types.ObjectId, ref: 'DataSource', required: false },

    versionValue: { type: String, required: true },

    rowData: { type: Schema.Types.Mixed, required: true },

    status: {
      type: String,
      enum: ['active', 'in-active', 'invalid'],
      default: 'active',
    },

    createdBy: { type: Schema.Types.ObjectId },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  {
    timestamps: false,
  }
);

// ✅ Indexing for performance (VERY IMPORTANT)
defaultCentralFileSchema.index({
  centralFileId: 1,
  entityId: 1,
  status: 1,
  updatedAt: 1,
});

// Expected fields
const expectedFields = Object.keys(defaultCentralFileSchema.paths);

// Function to create dynamic model
const createDefaultCentralFileModel = (schemaName: string) => {
  const existingModel = models[schemaName];

  if (existingModel) {
    const existingFields = Object.keys(existingModel.schema.paths);

    // ✅ Only check missing fields
    const missingFields = expectedFields.filter((f) => !existingFields.includes(f));

    if (missingFields.length > 0) {
      console.warn(
        `Schema for ${schemaName} is missing fields: ${missingFields.join(', ')}, refreshing model...`
      );
      connection.deleteModel(schemaName);
    } else {
      return existingModel;
    }
  }

  return model<IDefaultCentralFileValue>(schemaName, defaultCentralFileSchema);
};

export default createDefaultCentralFileModel;