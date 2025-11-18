/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Document, Types } from 'mongoose';

export interface IFile extends Document {
  _id: string | Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  mimeType: string;
  type: string;
  path: string;
  size: number;
  content: Buffer | string | Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  fileUri: string;
  uriExpiresAt: Date | null;
}

const fileSchema = new Schema<IFile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    name: { type: String, required: true },
    mimeType: { type: String, required: true },
    type: { type: String, required: false },
    size: { type: Number, required: false },
    content: { type: String, default: '' },
    fileUri: { type: String, default: '' },
    path: { type: String, default: '' },
    isDeleted: { type: Boolean, default: false },
    uriExpiresAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

const File = model<IFile>('File', fileSchema);

export default File;
