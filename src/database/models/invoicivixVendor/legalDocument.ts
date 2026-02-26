/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Document, Types } from 'mongoose';

export interface ILegalDocument extends Document {
  organizationId: Types.ObjectId;
  vendorId: Types.ObjectId;

  documentName: string;
  referenceId?: string;

  legalDocumentFileName?: string;
  legalDocumentFilePath?: string;

  validFromDate?: Date;
  validEndDate?: Date;

  status: 'active' | 'expired';

  createdAt: Date;
  updatedAt: Date;
}

const legalDocumentSchema = new Schema<ILegalDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },

    documentName: {
      type: String,
      required: true,
      trim: true,
    },

    referenceId: {
      type: String,
      trim: true,
      default: '',
    },

    legalDocumentFileName: {
      type: String,
      trim: true,
      default: '',
    },

    legalDocumentFilePath: {
      type: String,
      trim: true,
      default: '',
    },

    validFromDate: {
      type: Date,
      default: null,
    },

    validEndDate: {
      type: Date,
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: ['active', 'expired'],
      default: 'active',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Fast lookup for vendor documents
 */
legalDocumentSchema.index({
  vendorId: 1,
  status: 1,
});

/**
 * Optional: Prevent duplicate same document for same vendor
 */
legalDocumentSchema.index(
  { vendorId: 1, documentName: 1, referenceId: 1 },
  { unique: false }
);

const LegalDocument = model<ILegalDocument>(
  'LegalDocument',
  legalDocumentSchema
);

export default LegalDocument;