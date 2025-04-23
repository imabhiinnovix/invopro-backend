import { Schema, model, Document, Types } from 'mongoose';

interface IDataSourceVersion {
  name: string;
  dataSourceVersionId: Types.ObjectId;
  versionCode: string;
  dataSourceId: Types.ObjectId;
  code: string;
}

interface IReportRequest extends Document {
  organizationId: Types.ObjectId;
  customReportId: Types.ObjectId;
  versionValue: string;
  filePath?: string;
  fileType?: string;
  fileSize?: string;
  status: 'failed' | 'processing' | 'completed';
  fileName?: string;
  createdBy: Types.ObjectId;
  dataSourceVersion: IDataSourceVersion[];
}

const dataSourceVersionSchema = new Schema<IDataSourceVersion>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    dataSourceVersionId: { type: Schema.Types.ObjectId, ref: 'data_source_version' },
    versionCode: { type: String, required: true },
    dataSourceId: { type: Schema.Types.ObjectId, ref: 'data_sources' },
  },
  { _id: false }
);

const reportRequestSchema = new Schema<IReportRequest>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    customReportId: { type: Schema.Types.ObjectId, ref: 'custom_reports' },
    versionValue: { type: String, required: true },
    status: {
      type: String,
      enum: ['failed', 'processing', 'completed'], // Restricting the values of status
      required: true,
      default: 'processing', // Optional: Default value for status
    },
    fileName: { type: String },
    filePath: { type: String },
    fileType: { type: String },
    fileSize: { type: String },
    dataSourceVersion: { type: [dataSourceVersionSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

const ReportRequestModel = model<IReportRequest>('report_request', reportRequestSchema);

export default ReportRequestModel;
