/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import config from '../../../config';
import { Schema, model, Document, Types } from 'mongoose';

interface IFieldSetting {
  attributeId: Types.ObjectId;
  refAttributeId?: Types.ObjectId[];
  label?: string;
  isFilterEnable?: boolean;
  isSortingEnable?: boolean;
  isDisplayEnable?: boolean;
  isDashboardFilter: boolean;
  type: 'number' | 'text' | 'date' | 'boolean' | 'richtext' | 'url' | 'option' | 'multioption' | 'user';
  isDerived: boolean;
}

interface IDataUploadCondition {
  field: string;
  operator: string;
  value: any;
  fieldType: string;
}

interface IDataSource extends Document {
  organizationId: Types.ObjectId;
  entityId: Types.ObjectId;
  name: string;
  code: string;
  versionType: string;
  description: string;
  updatedBy?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  isActive: boolean;
  canEditInline: boolean;
  uniqueAttributeRules: Types.ObjectId[][];
  isVisible: boolean;
  isShowMenu: boolean;
  fieldSettings: IFieldSetting[];
  condition: IDataUploadCondition[];
}

// Embedded sub-schema for field settings
const fieldSettingSchema = new Schema<IFieldSetting>(
  {
    attributeId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    refAttributeId: {
      type: [Schema.Types.ObjectId],
      default: [], // Always an array, even for single level
    },
    label: {
      type: String,
    },
    isFilterEnable: {
      type: Boolean,
      default: false,
    },
    isDashboardFilter: {
      type: Boolean,
      default: true,
    },
    isSortingEnable: {
      type: Boolean,
      default: false,
    },
    isDisplayEnable: {
      type: Boolean,
      default: false,
    },
    isDerived: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      required: true,
      enum: config.FIELD_TYPE_ENUM,
    },
  },
  { _id: false }
);

const dataUploadConditionSchema = new Schema<IDataUploadCondition>(
  {
    field: { type: String, required: true },
    operator: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
    fieldType: { type: String, required: true },
  },
  { _id: false }
);

// DataSource Schema
const dataSourceSchema = new Schema<IDataSource>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    entityId: { type: Schema.Types.ObjectId, ref: 'Entity', required: true },
    name: { type: String, required: true },
    description: { type: String },
    code: { type: String, required: true },
    versionType: { type: String, required: true },
    isActive: { type: Boolean, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'user' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'user' },
    canEditInline: { type: Boolean, default: false },
    uniqueAttributeRules: {
      type: [[Schema.Types.ObjectId]],
      default: [],
    },
    isVisible: { type: Boolean, default: true },
    condition: {
      type: [dataUploadConditionSchema],
      default: [],
    },
    // Replacing filterFields/sortFields/displayFields with unified fieldSettings
    fieldSettings: {
      type: [fieldSettingSchema],
      default: [],
    },
    isShowMenu: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Indexes
dataSourceSchema.index({ code: 1, organizationId: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
dataSourceSchema.index({ name: 1, organizationId: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

const DataSource = model<IDataSource>('data_source', dataSourceSchema);

export default DataSource;
