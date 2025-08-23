/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Document, Types } from 'mongoose';
import config from '../../../config';

// ---------------------------
// Reference Entity Setting interface
// ---------------------------
export interface IReferenceEntitySetting {
  refEntityId: Types.ObjectId;
  refEntityField?: Types.ObjectId;
  relationType: 'one_to_one' | 'many_to_one' | 'mapping_one_to_one' | 'mapping_many_to_one';
}

// ---------------------------
// Attribute interface
// ---------------------------
export interface IAttribute {
  name: string;
  mappingName: string;
  type:
    | 'number'
    | 'text'
    | 'date'
    | 'boolean'
    | 'richtext'
    | 'url'
    | 'option'
    | 'multioption'
    | 'user'
    | 'email'
    | 'text-with-option';
  required: any;
  validation?: string[];
  transformations?: string[];
  optionAttributeId?: string;
  cleaner?: string[];
  referenceEntitySetting?: IReferenceEntitySetting;
  isReferenceEdit?: boolean; // ✅ Added
}

// ---------------------------
// Entity interface
// ---------------------------
interface IEntity extends Document {
  name: string;
  description?: string;
  attributes?: IAttribute[];
  organizationId: Types.ObjectId;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  isActive: boolean;
}

// ---------------------------
// ReferenceEntitySetting Schema
// ---------------------------
const referenceEntitySettingSchema = new Schema<IReferenceEntitySetting>(
  {
    refEntityId: {
      type: Schema.Types.ObjectId,
      ref: 'Entity',
      required: true,
    },
    refEntityField: {
      type: Schema.Types.ObjectId,
    },
    relationType: {
      type: String,
      enum: ['one_to_one', 'many_to_one', 'mapping_one_to_one', 'mapping_many_to_one'], // ✅ Added new relation types
      required: true,
    },
  },
  { _id: false }
);

// ---------------------------
// Attribute Schema
// ---------------------------
const attributeSchema = new Schema<IAttribute>(
  {
    name: { type: String, required: true },
    mappingName: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: config.FIELD_TYPE_ENUM,
    },
    required: {
      type: Boolean,
      required: true,
      get: (value: boolean) => (value ? 'Mandatory' : 'Not Mandatory'),
    },
    validation: { type: [String] },
    transformations: { type: [String] },
    optionAttributeId: {
      type: Types.ObjectId,
      ref: 'attribute_option',
      default: null,
      set: (value: any) => (value === '' ? null : value),
    },
    cleaner: { type: [String] },
    referenceEntitySetting: {
      type: referenceEntitySettingSchema,
      required: false,
    },
    isReferenceEdit: { type: Boolean, default: false }, // ✅ Added
  },
  { _id: true, toJSON: { getters: true }, toObject: { getters: true } }
);

// ---------------------------
// Entity Schema
// ---------------------------
const entitySchema = new Schema<IEntity>(
  {
    name: { type: String, required: true },
    description: { type: String },
    attributes: { type: [attributeSchema], default: [] },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'user' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'user' },
    isActive: { type: Boolean, required: true },
  },
  {
    timestamps: true,
  }
);

// Unique index
entitySchema.index(
  { name: 1, organizationId: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

// ---------------------------
// Model
// ---------------------------
const Entity = model<IEntity>('Entity', entitySchema);

export default Entity;