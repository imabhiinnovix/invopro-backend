import { Schema, model, Document, Types } from 'mongoose';

interface IDataSource {
  code: string;
  dataSourceId: string;
  fileDetails: { name: string; sheetName: string }[];
}

interface ICustomReport extends Document {
  reportName: string;
  functionName: string;
  dataSourceIds: IDataSource[];
  organizationId: Types.ObjectId;
  sampleFilePath: string;
}

const CustomReportSchema = new Schema<ICustomReport>(
  {
    reportName: { type: String, required: true },
    functionName: { type: String, required: true },
    sampleFilePath: { type: String },
    dataSourceIds: [
      {
        code: { type: String, required: true },
        dataSourceId: { type: String, required: true, ref: 'data_source' },
        fileDetails: { type: [{ name: String, sheetName: String }] },
      },
    ],
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  },
  {
    timestamps: true,
  }
);

const CustomReportModel = model<ICustomReport>('custom_reports', CustomReportSchema);

export default CustomReportModel;
