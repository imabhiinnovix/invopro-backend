import { Schema, model, Document, Types } from 'mongoose';

interface IFieldSetting {
  attributeId: Types.ObjectId;
  refAttributeId?: Types.ObjectId;
  label?: string;
  isFilterEnable?: boolean;
  isSortingEnable?: boolean;
  isDisplayEnable?: boolean;
  isDashboardFilter: boolean;
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
}

// Embedded sub-schema for field settings
const fieldSettingSchema = new Schema<IFieldSetting>(
  {
    attributeId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    refAttributeId: {
      type: Schema.Types.ObjectId,
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
