import { Schema, model, Document, Types } from 'mongoose';

interface IDataImportError extends Document {
  dataSourceId: Types.ObjectId;
  entityId: Types.ObjectId;
  dataSourceVersionId: Types.ObjectId;
  rowNumber: number;
  fileAttributeName: string;
  attributeName: string;
  errorType: string;
  errorMessage: string;
  errorCode: string;
  fileAttributeValue: any;
  createdAt: Date;
}
const DataImportErrorSchema = new Schema<IDataImportError>(
  {
    entityId: { type: Schema.Types.ObjectId, ref: 'Entity' },
    dataSourceId: { type: Schema.Types.ObjectId, ref: 'data_source' },
    dataSourceVersionId: { type: Schema.Types.ObjectId, ref: 'data_source_version' },
    rowNumber: { type: Number },
    fileAttributeName: { type: String },
    attributeName: { type: String },
    fileAttributeValue: { type: Schema.Types.Mixed },
    errorType: { type: String },
    errorCode: { type: String },
    errorMessage: { type: String },
  },
  {
    timestamps: true,
  }
);

const DataImportErrorModel = model<IDataImportError>('data_import_error', DataImportErrorSchema);

export default DataImportErrorModel;
