import { Schema, model, models, Document, Types } from 'mongoose';

interface IDefaultDataSourceVersionValue extends Document {
  entityId: Types.ObjectId;
  dataSourceId: Types.ObjectId;
  dataSourceVersionId: Types.ObjectId;
  versionValue: string;
  rowData: Record<string, any>;
  status: 'active' | 'in-active'; // ✅ added status
  createdBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

// Mongoose Schema
const defaultDataSourceVersionSchema = new Schema<IDefaultDataSourceVersionValue>(
  {
    entityId: { type: Schema.Types.ObjectId, ref: 'Entity' },
    dataSourceId: { type: Schema.Types.ObjectId, ref: 'DataSource' },
    dataSourceVersionId: { type: Schema.Types.ObjectId, ref: 'data_source_version' },
    versionValue: { type: String },
    rowData: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['active', 'in-active'], // ✅ enum constraint
      default: 'active',
    },
    createdBy: { type: Schema.Types.ObjectId },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  {
    timestamps: false, // you are manually handling createdAt/updatedAt
  }
);

defaultDataSourceVersionSchema.index({ dataSourceVersionId: 1 });

// Function to create a model with a dynamic schema name
const createDefaultDataSourceVersionModel = (schemaName: string) => {
  if (models[schemaName]) {
    return models[schemaName];
  }
  return model<IDefaultDataSourceVersionValue>(schemaName, defaultDataSourceVersionSchema);
};

export default createDefaultDataSourceVersionModel;