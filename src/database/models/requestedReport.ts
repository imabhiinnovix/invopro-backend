import { Schema, model, Document, Types } from 'mongoose';

interface IReportRequest extends Document {
  organizationId: Types.ObjectId;
  customReportId: Types.ObjectId;
  versionValue: string;
  filePath?: string;
  fileType?: string;
  fileSize?: string;
  status: 'failed' | 'processing' | 'processed';
  fileName?: string;
  createdBy: Types.ObjectId;
}

const reportRequestSchema = new Schema<IReportRequest>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    customReportId: { type: Schema.Types.ObjectId, ref: 'custom_reports' },
    versionValue: { type: String, required: true },
    status: {
      type: String,
      enum: ['failed', 'processing', 'processed'], // Restricting the values of status
      required: true,
      default: 'processing', // Optional: Default value for status
    },
    fileName: { type: String },
    filePath: { type: String },
    fileType: { type: String },
    fileSize: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

const ReportRequestModel = model<IReportRequest>('report_request', reportRequestSchema);

export default ReportRequestModel;
