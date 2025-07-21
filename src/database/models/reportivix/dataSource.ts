import { Schema, model, Document, Types } from 'mongoose';

// Field selection structure for filter/sort/display fields
interface IFieldSelection {
  attributeId: Types.ObjectId;
  refAttributeId?: Types.ObjectId;
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

  filterFields: IFieldSelection[];
  sortFields: IFieldSelection[];
  displayFields: IFieldSelection[];
}

// Embedded sub-schema for a single field reference
const fieldSelectionSchema = new Schema<IFieldSelection>(
  {
    attributeId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    refAttributeId: {
      type: Schema.Types.ObjectId,
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
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    canEditInline: { type: Boolean, default: false },
    uniqueAttributeRules: {
      type: [[Schema.Types.ObjectId]],
      default: [],
    },
    isVisible: { type: Boolean, default: true },

    // NEW: configurable UI behavior fields
    filterFields: {
      type: [fieldSelectionSchema],
      default: [],
    },
    sortFields: {
      type: [fieldSelectionSchema],
      default: [],
    },
    displayFields: {
      type: [fieldSelectionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
dataSourceSchema.index(
  { code: 1, organizationId: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);
dataSourceSchema.index(
  { name: 1, organizationId: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

// Model
const DataSource = model<IDataSource>('data_source', dataSourceSchema);

export default DataSource;
