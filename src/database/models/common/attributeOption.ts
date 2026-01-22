/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Document, Types } from 'mongoose';

// Define the IAttribute interface
interface IAttribute extends Document {
  attributeName: string;
  attributeValue: string[];
  organizationId: Types.ObjectId;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isActive: boolean;
  isPopulateFixed: number; // 0 | 1 | 2
}

// Define the attribute Schema
const attributeSchema = new Schema<IAttribute>(
  {
    attributeName: { type: String, required: true },

    attributeValue: {
      type: [String],
      default: [],
    },

    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'user',
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // ✅ ONLY ADDITION
    isPopulateFixed: {
      type: Number,
      enum: [0, 1, 2],
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

attributeSchema.index(
  { attributeName: 1, organizationId: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

// Create the attribute model
const AttributeOption = model<IAttribute>(
  'attribute_option',
  attributeSchema
);

export default AttributeOption;