import { Schema, model, models, Document, Types } from 'mongoose';

interface IDefaultImportLogDataSourceVersionValue extends Document {
  entityId: Types.ObjectId;
  dataSourceId: Types.ObjectId;
  dataSourceVersionId: Types.ObjectId;
  versionValue: string;
  rowNumber: Number,
  rowData: Record<string, any>; // Defines rowData as an object with string keys and values of any type
  isErrorLog: Number,
  createdBy?: Types.ObjectId;
  createdAt?: Date; // Added by timestamps
  updatedAt?: Date; // Added by timestamps
}

// Mongoose Schema
const defaultImportLogDataSourceVersionSchema = new Schema<IDefaultImportLogDataSourceVersionValue>(
  {
    entityId: { type: Schema.Types.ObjectId, ref: 'Entity' },
    dataSourceId: { type: Schema.Types.ObjectId, ref: 'DataSource' },
    dataSourceVersionId: { type: Schema.Types.ObjectId, ref: 'data_source_version' },
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

defaultImportLogDataSourceVersionSchema.index({ dataSourceVersionId: 1 });

// Function to create a model with a dynamic schema name
const createDefaultImportLogDataSourceVersionModel = (schemaName: string) => {
  if (models[schemaName]) {
    // If the model already exists, return it
    return models[schemaName];
  }
  // Otherwise, create and return the model
  return model<IDefaultImportLogDataSourceVersionValue>(schemaName, defaultImportLogDataSourceVersionSchema);
};

export default createDefaultImportLogDataSourceVersionModel;
