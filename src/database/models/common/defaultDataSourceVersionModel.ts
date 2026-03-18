/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, models, connection, Document, Types } from 'mongoose';

interface IDefaultDataSourceVersionValue extends Document {
  entityId: Types.ObjectId;
  dataSourceId: Types.ObjectId;
  dataSourceVersionId: Types.ObjectId;
  versionValue: string;
  rowData: Record<string, any>;
  conversion?: {
    baseCurrency: string;
    targetCurrency: string;
    rate: number;
  };
  status: 'active' | 'in-active';
  createdBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

// Schema
const defaultDataSourceVersionSchema = new Schema<IDefaultDataSourceVersionValue>(
  {
    entityId: { type: Schema.Types.ObjectId, ref: 'Entity' },
    dataSourceId: { type: Schema.Types.ObjectId, ref: 'DataSource' },
    dataSourceVersionId: { type: Schema.Types.ObjectId, ref: 'data_source_version' },
    versionValue: { type: String },
    rowData: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['active', 'in-active'],
      default: 'active',
    },
    conversion: {
      baseCurrency: { type: String },
      targetCurrency: { type: String },
      rate: { type: Number },
    },
    createdBy: { type: Schema.Types.ObjectId },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  {
    timestamps: false, // manual createdAt/updatedAt
  }
);

defaultDataSourceVersionSchema.index({ dataSourceVersionId: 1, status: 1, updatedAt: 1 });

// Expected top-level fields
const expectedFields = Object.keys(defaultDataSourceVersionSchema.paths);

// Function to create a model with dynamic schema name
const createDefaultDataSourceVersionModel = (schemaName: string) => {
  const existingModel = models[schemaName];

  if (existingModel) {
    const existingFields = Object.keys(existingModel.schema.paths);

    // ✅ Only check for missing fields
    const missingFields = expectedFields.filter((f) => !existingFields.includes(f));

    if (missingFields.length > 0) {
      console.warn(
        `Schema for ${schemaName} is missing fields: ${missingFields.join(', ')}, refreshing model...`
      );
      connection.deleteModel(schemaName);
    } else {
      return existingModel; // reuse safely
    }
  }

  return model<IDefaultDataSourceVersionValue>(schemaName, defaultDataSourceVersionSchema);
};

export default createDefaultDataSourceVersionModel;