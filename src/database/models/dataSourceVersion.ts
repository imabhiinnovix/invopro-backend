import { Schema, model, Document, Types } from 'mongoose';

interface IDataSourceVersion extends Document {
  organizationId: Types.ObjectId;
  dataSourceId: Types.ObjectId;
  entityId: Types.ObjectId;
  versionValue: string;
  filePath: string;
  fileType: string;
  fileSize: string;
  updatedBy?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  isActive: boolean;
  versionName: string;
  errorMessage: string[];
  status: 'Failed' | 'Processing' | 'Success';
  fileName: string;
  mappings: Record<string, string>;
}

const dataSourceVersionSchema = new Schema<IDataSourceVersion>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    dataSourceId: { type: Schema.Types.ObjectId, ref: 'DataSource' },
    entityId: { type: Schema.Types.ObjectId, ref: 'Entity' },
    versionValue: { type: String, required: true },
    versionName: { type: String, required: true },
    status: {
      type: String,
      enum: ['Failed', 'Processing', 'Success'], // Restricting the values of status
      required: true,
      default: 'Processing', // Optional: Default value for status
    },
    mappings: {
      type: Map, // Mongoose's Map type to store key-value pairs
      of: String, // The values in the map are strings
      default: {}, // Optional: Default to an empty map if no mappings are provided
    },
    errorMessage: {
      type: [String], // Array of strings
      default: [], // Optional: Default to an empty array if no error messages are provided
    },
    fileName: { type: String },
    filePath: { type: String },
    fileType: { type: String },
    fileSize: { type: String },
    isActive: { type: Boolean, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

dataSourceVersionSchema.index(
  { dataSourceId: 1, versionValue: 1, versionName: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

const DataSourceVersion = model<IDataSourceVersion>('DataSourceVersion', dataSourceVersionSchema);

export default DataSourceVersion;
