import { Schema, model, Document, Types } from 'mongoose';

interface IDataSourceVersion extends Document {
  organizationId: Types.ObjectId;
  dataSourceId: Types.ObjectId;
  versionValue: string;
  filePath: string;
  fileType: string;
  fileSize: string;
  updatedBy?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  isActive: boolean;
  //   isLatest: boolean;
  versionName: string;
}

const dataSourceVersionSchema = new Schema<IDataSourceVersion>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    dataSourceId: { type: Schema.Types.ObjectId, ref: 'DataSource' },
    versionValue: { type: String, required: true },
    versionName: { type: String, required: true },
    // isLatest: { type: Boolean, required: true },//not requered we can get it using ceatedAt
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
