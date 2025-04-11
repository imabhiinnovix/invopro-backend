/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema, model, Document, Types } from 'mongoose';

interface IDashboardWidget extends Document {
  createdBy: Types.ObjectId;
  widgetAppearanceId: Types.ObjectId;
  dashboardId: Types.ObjectId;
  organizationId: Types.ObjectId;
  widgetTypeId: Types.ObjectId;
  entityId: Types.ObjectId;
  name: string;
  description: string;
  position: {
    x: number;
    y: number;
    index: number;
  };
  dataSourceId: Types.ObjectId;
  dimensions: string[];
  groupBy: string[];
  aggregation: {
    type: string;
    attributeName: string;
  };
  conditions: {
    field: string;
    operator: string;
    value: any;
    fieldType: string;
  }[];
  isActive: boolean;
  isDeleted: boolean;
}

const dashboardWidgetSchema = new Schema<IDashboardWidget>(
  {
    widgetAppearanceId: { type: Schema.Types.ObjectId, ref: 'widget_appearance', required: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dashboardId: { type: Schema.Types.ObjectId, ref: 'dashboard', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    widgetTypeId: { type: Schema.Types.ObjectId, ref: 'widget_type', required: true },
    entityId: { type: Schema.Types.ObjectId, ref: 'Entity', required: true },
    name: { type: Schema.Types.String, required: true, trim: true },
    description: { type: Schema.Types.String, trim: true },
    position: {
      x: { type: Schema.Types.Number, required: true, min: 0 },
      y: { type: Schema.Types.Number, required: true, min: 0 },
      index: { type: Schema.Types.Number, required: true, min: 0 },
    },
    dataSourceId: { type: Schema.Types.ObjectId, ref: 'data_source', required: true },
    dimensions: { type: [String], default: [] },
    groupBy: { type: [String], default: [] },
    aggregation: {
      type: {
        type: String,
        required: true,
        enum: ['Count', 'Sum', 'Average'],
      },
      attributeName: { type: String, required: true },
    },
    conditions: [
      {
        field: String, // Attribute Name
        operator: String, // Operator (e.g., "equals")
        value: Schema.Types.Mixed, // Value (supports various data types)
      },
    ],
    isActive: { type: Schema.Types.Boolean, default: true, required: true },
    isDeleted: { type: Schema.Types.Boolean, default: false, required: true },
  },
  {
    timestamps: true,
  }
);

export default model<IDashboardWidget>('dashboard_widget', dashboardWidgetSchema);
