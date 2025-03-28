/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema, model, Document, Types } from 'mongoose';

interface IDashboardWidget extends Document {
  createdBy: Types.ObjectId;
  dashboardId: Types.ObjectId;
  organizationId: Types.ObjectId;
  widgetTypeId: Types.ObjectId;
  name: string;
  description: string;
  position: any;
  index: number;
  dataSourceId: Types.ObjectId;
  dimensions: string;
  groupBy: string;
  aggregation: {
    type: string;
    attributeName: string;
  };
  conditions: {
    field: string;
    operator: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
  }[];
  isActive: boolean;
}

const dashboardWidgetSchema = new Schema<IDashboardWidget>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    dashboardId: { type: Schema.Types.ObjectId, ref: 'dashboard' },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    widgetTypeId: { type: Schema.Types.ObjectId, ref: 'widget_type' },
    name: { type: Schema.Types.String },
    description: { type: Schema.Types.String },
    position: {
      x: {
        type: Schema.Types.Number,
      },
      y: {
        type: Schema.Types.Number,
      },
      index: { type: Schema.Types.Number },
    },
    // New fields based on the image and sample object
    dataSourceId: { type: Schema.Types.ObjectId, ref: 'data_source' },
    dimensions: [String],
    groupBy: [String], // Array of selected attributes for dimensions
    aggregation: {
      type: {
        type: String,
        enum: ['Count', 'Sum', 'Average'], // Aggregation type
      },
      attributeName: String, // Renamed from "field" to match image terminology
    },
    conditions: [
      {
        field: String, // Attribute Name
        operator: String, // Operator (e.g., "equals")
        value: Schema.Types.Mixed, // Value (supports various data types)
      },
    ],
    isActive: { type: Schema.Types.Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export default model<IDashboardWidget>('dashboard_widget', dashboardWidgetSchema);
