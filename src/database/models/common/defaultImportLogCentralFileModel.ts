/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, models, Document, Types } from 'mongoose';

interface IDefaultImportLogCentralFileValue extends Document {
  entityId: Types.ObjectId;
  dataSourceId: Types.ObjectId;
  centralFileId?: Types.ObjectId; // NEW
  versionValue: string;
  rowNumber: Number,
  rowData: Record<string, any>; // Defines rowData as an object with string keys and values of any type
  isErrorLog: Number,
  createdBy?: Types.ObjectId;
  createdAt?: Date; // Added by timestamps
  updatedAt?: Date; // Added by timestamps
}

// Mongoose Schema
const defaultImportLogCentralFileSchema = new Schema<IDefaultImportLogCentralFileValue>(
  {
    entityId: { type: Schema.Types.ObjectId, ref: 'Entity' },
    dataSourceId: { type: Schema.Types.ObjectId, ref: 'DataSource' },
    // NEW: Central file reference (always present)
    centralFileId: {
      type: Schema.Types.ObjectId,
      ref: 'central_file',
      index: true,
    },
    versionValue: { type: String },
    rowNumber: {type: Number},
    rowData: { type: Schema.Types.Mixed }, // Accepts any type of object
    isErrorLog: {type: Number, default: 0},
    createdBy: { type: Schema.Types.ObjectId },
    createdAt: { type: Date, default: new Date(Date.now()).toISOString() },
    updatedAt: { type: Date, default: new Date(Date.now()).toISOString() },
  },
  {
    timestamps: false, // Automatically manage createdAt and updatedAt timestamps
  }
);

defaultImportLogCentralFileSchema.index({ centralFileId: 1, isErrorLog: 1 });

// Function to create a model with a dynamic schema name
const createDefaultImportLogCentralFileModel = (schemaName: string) => {
  if (models[schemaName]) {
    // If the model already exists, return it
    return models[schemaName];
  }
  // Otherwise, create and return the model
  return model<IDefaultImportLogCentralFileValue>(schemaName, defaultImportLogCentralFileSchema);
};

export default createDefaultImportLogCentralFileModel;
