import { Schema, model, Document } from 'mongoose';
import config from '../../config';
import {
  ITitle,
  ILegend,
  ITooltip,
  IScales,
  IInteraction,
  ILayout,
  IFill,
  titleSchema,
  legendSchema,
  tooltipSchema,
  scalesSchema,
  interactionSchema,
  layoutSchema,
  fillSchema,
} from './widgetConfigSchema';

export interface IWidgetTheme extends Document {
  organizationId: Schema.Types.ObjectId;
  createdBy: Schema.Types.ObjectId;

  name: string;
  description: string;
  title?: ITitle;
  subtitle?: ITitle;
  legend?: ILegend;
  tooltip?: ITooltip;
  scales?: IScales;
  interaction?: IInteraction;
  layout?: ILayout;
  fill?: IFill;
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  chartType?: string;
  colors?: string[];
  borderColor?: string[];
  backgroundColor?: string[];
  isDefault?: boolean;
  isActive?: boolean;
  isDeleted?: boolean;
  showLegendOverlay?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const widgetThemeSchema = new Schema<IWidgetTheme>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },

    name: { type: String, required: true },
    description: { type: String },
    title: titleSchema,
    subtitle: titleSchema,
    legend: legendSchema,
    tooltip: tooltipSchema,
    scales: scalesSchema,
    interaction: interactionSchema,
    layout: layoutSchema,
    fill: fillSchema,
    responsive: { type: Boolean, default: true },
    maintainAspectRatio: { type: Boolean, default: false },
    chartType: {
      type: String,
      enum: config.CHART_TYPE_ENUM,
      default: 'line',
    },
    colors: {
      type: [String],
      default: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
    },
    borderColor: {
      type: [String],
      default: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
    },
    backgroundColor: {
      type: [String],
      default: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
    },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    showLegendOverlay: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export default model<IWidgetTheme>('widget_theme', widgetThemeSchema);
