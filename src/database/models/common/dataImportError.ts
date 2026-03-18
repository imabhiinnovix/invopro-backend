/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Document, Types } from 'mongoose';

interface IDataImportError extends Document {
  dataSourceId: Types.ObjectId;
  entityId: Types.ObjectId;
  centralFileId?: Types.ObjectId; // NEW
  dataSourceVersionId: Types.ObjectId;
  rowNumber: number;
  fileAttributeName: string;
  attributeName: string;
  attributeOptionId: Types.ObjectId;
  errorType: string;
  errorMessage: string;
  errorCode: string;
  errorRowId?: Types.ObjectId;
  fileAttributeValue: any;
  createdAt: Date;
  status: string;
  refEntityId: Types.ObjectId;
  refDataSourceId: Types.ObjectId;
  attributeType: string;
  refAttributeId: Types.ObjectId;
  fileRowNumber: String;
  fileName: String;
}
const DataImportErrorSchema = new Schema<IDataImportError>(
  {
    entityId: { type: Schema.Types.ObjectId, ref: 'Entity' },
    dataSourceId: { type: Schema.Types.ObjectId, ref: 'data_source' },
    //NEW: Central File reference (always present)
    centralFileId: { type: Schema.Types.ObjectId, ref: 'central_file', index: true },
    // ✅ datasource version may not exist yet
    dataSourceVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'data_source_version',
    },
    rowNumber: { type: Number },
    fileRowNumber: { type: String },
    fileName: { type: String },
    fileAttributeName: { type: String },
    attributeName: { type: String },
    fileAttributeValue: { type: Schema.Types.Mixed },
    attributeOptionId: { type: Schema.Types.ObjectId, ref: 'attribute_option' },
    attributeType: { type: String },
    refAttributeId: { type: Schema.Types.ObjectId },
    refEntityId: { type: Schema.Types.ObjectId, ref: 'Entity' },
    refDataSourceId: { type: Schema.Types.ObjectId, ref: 'data_source' },
    status: {
      type: String,
      enum: ['open', 'resolved', 'discarded'],
      default: 'open', // optional default value
    },
    errorRowId: {type: Schema.Types.ObjectId, default:null},
    errorType: { type: String },
    errorCode: { type: String },
    errorMessage: { type: String },
  },
  {
    timestamps: true,
  }
);
DataImportErrorSchema.index({
  centralFileId: 1,
  status: 1,
});
DataImportErrorSchema.index({
  dataSourceVersionId: 1,
  status: 1,
});

const DataImportErrorModel = model<IDataImportError>('data_import_error', DataImportErrorSchema);

export default DataImportErrorModel;
