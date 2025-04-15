/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema, model, Document } from 'mongoose';
import config from '../../config';

export type FieldType = 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date' | 'custom';

export interface IFieldConfigItem {
  fieldName: string;
  display: boolean;
  required?: boolean;
  multiple?: boolean;
  type?: FieldType;
  label?: string;
  defaultValue?: any;
}

export interface IWidgetType extends Document {
  _id: string;
  name: string;
  description?: string;
  chartType: string;
  code: string;
  isActive: boolean;
  fieldConfig: IFieldConfigItem[];
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

const FieldConfigItemSchema = new Schema<IFieldConfigItem>(
  {
    fieldName: { type: String, required: true },
    display: { type: Boolean, default: true },
    required: { type: Boolean, default: false },
    multiple: { type: Boolean },
    type: { type: String, default: 'string' },
    label: { type: String },
    defaultValue: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const WidgetTypeSchema = new Schema<IWidgetType>(
  {
    name: { type: Schema.Types.String, required: true },
    description: { type: Schema.Types.String },
    chartType: {
      type: Schema.Types.String,
      required: true,
      enum: config.CHART_TYPE_ENUM,
    }, // Added more types
    code: { type: Schema.Types.String },
    isActive: { type: Boolean, default: true, required: true },
    fieldConfig: [FieldConfigItemSchema],
  },
  {
    timestamps: true,
  }
);

WidgetTypeSchema.index({ name: 1, code: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export default model<IWidgetType>('widget_type', WidgetTypeSchema);
