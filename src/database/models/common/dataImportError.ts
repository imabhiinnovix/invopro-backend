import { Schema, model, Document, Types } from 'mongoose';

interface IDataImportError extends Document {
  dataSourceId: Types.ObjectId;
  entityId: Types.ObjectId;
  dataSourceVersionId: Types.ObjectId;
  rowNumber: number;
  fileAttributeName: string;
  attributeName: string;
  attributeOptionId: Types.ObjectId;
  errorType: string;
  errorMessage: string;
  errorCode: string;
  fileAttributeValue: any;
  createdAt: Date;
  status: string;
  refEntityId: Types.ObjectId;
  attributeType: string;
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
    attributeOptionId: { type: Schema.Types.ObjectId, ref: 'attribute_option' },
    attributeType: { type: String },
    refEntityId: { type: Schema.Types.ObjectId, ref: 'Entity' },
    status: {
      type: String,
      enum: ['open', 'resolved', 'discarded'],
      default: 'open', // optional default value
    },
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
