/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

// widget_theme_overrides.schema.ts (using Mongoose + TypeScript)
import { Schema, model, Types, Document } from 'mongoose';
import {
  titleSchema,
  legendSchema,
  tooltipSchema,
  scalesSchema,
  interactionSchema,
  layoutSchema,
  fillSchema,
  ITitle,
  ILegend,
  ITooltip,
  IScales,
  IInteraction,
  ILayout,
  IFill,
} from './widgetConfigSchema';

export interface IWidgetAppearance extends Document {
  dashboardId: Types.ObjectId;
  dashboardWidgetId: Types.ObjectId;
  createdBy: Types.ObjectId;
  organizationId: Types.ObjectId;
  title?: ITitle;
  subtitle?: ITitle;
  legend?: ILegend;
  tooltip?: ITooltip;
  scales?: IScales;
  interaction?: IInteraction;
  layout?: ILayout;
  fill?: IFill;
  chartType?: string;
  colors?: string[];
  borderColor?: string[];
  backgroundColor?: string[];
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WidgetAppearanceSchema = new Schema<IWidgetAppearance>(
  {
    dashboardId: { type: Schema.Types.ObjectId, ref: 'dashboards', required: true },
    dashboardWidgetId: { type: Schema.Types.ObjectId, ref: 'dashboard_widgets', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'organizations', required: true },

    title: titleSchema,
    subtitle: titleSchema,
    legend: legendSchema,
    tooltip: tooltipSchema,
    scales: scalesSchema,
    interaction: interactionSchema,
    layout: layoutSchema,
    fill: fillSchema,
    chartType: String,
    colors: [String],
    borderColor: [String],
    backgroundColor: [String],
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default model<IWidgetAppearance>('widget_appearance', WidgetAppearanceSchema);
