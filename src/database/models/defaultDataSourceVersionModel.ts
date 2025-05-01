import { Schema, model, models, Document, Types } from 'mongoose';

interface IDefaultDataSourceVersionValue extends Document {
  entityId: Types.ObjectId;
  dataSourceId: Types.ObjectId;
  dataSourceVersionId: Types.ObjectId;
  versionValue: string;
  rowData: Record<string, any>; // Defines rowData as an object with string keys and values of any type
  createdBy?: Types.ObjectId;
  createdAt?: Date; // Added by timestamps
  updatedAt?: Date; // Added by timestamps
}

// Mongoose Schema
const defaultDataSourceVersionSchema = new Schema<IDefaultDataSourceVersionValue>(
  {
    entityId: { type: Schema.Types.ObjectId, ref: 'Entity' },
    dataSourceId: { type: Schema.Types.ObjectId, ref: 'DataSource' },
    dataSourceVersionId: { type: Schema.Types.ObjectId, ref: 'data_source_version' },
    versionValue: { type: String, required: true },
    rowData: { type: Schema.Types.Mixed }, // Accepts any type of object
    createdBy: { type: Schema.Types.ObjectId },
    createdAt: { type: Date, default: new Date(Date.now()).toISOString() },
    updatedAt: { type: Date, default: new Date(Date.now()).toISOString() },
  },
  {
    timestamps: false, // Automatically manage createdAt and updatedAt timestamps
  }
);

defaultDataSourceVersionSchema.index({ dataSourceVersionId: 1 });

// Function to create a model with a dynamic schema name
const createDefaultDataSourceVersionModel = (schemaName: string) => {
  if (models[schemaName]) {
    // If the model already exists, return it
    return models[schemaName];
  }
  // Otherwise, create and return the model
  return model<IDefaultDataSourceVersionValue>(schemaName, defaultDataSourceVersionSchema);
};

export default createDefaultDataSourceVersionModel;
