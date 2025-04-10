import { Schema, model, Document } from 'mongoose';
import config from '../../config';

interface IFont {
  size?: number;
  family?: string;
  weight?: string;
}

interface ITitle {
  display?: boolean;
  color?: string;
  font?: IFont;
  align?: 'start' | 'center' | 'end';
  position?: 'top' | 'left' | 'bottom' | 'right';
}

interface ILegendLabels {
  color?: string;
  font?: {
    size?: number;
    family?: string;
  };
  usePointStyle?: boolean;
  padding?: number;
  fillSchema;
  boxWidth?: number;
  boxHeight?: number;
}

interface ILegend {
  display?: boolean;
  position?: 'top' | 'left' | 'bottom' | 'right' | 'chartArea';
  labels?: ILegendLabels;
  maxHeight?: number;
}

interface ITooltip {
  display?: boolean;
  backgroundColor?: string;
  titleColor?: string;
  bodyColor?: string;
  borderColor?: string;
  borderWidth?: number;
  padding?: number;
  usePointStyle?: boolean;
  displayColors?: boolean;
}

interface IScale {
  display?: boolean;
  beginAtZero?: boolean;
  position?: 'top' | 'left' | 'bottom' | 'right';
  type?: 'linear' | 'logarithmic' | 'time' | 'category';
  grid?: {
    color?: string;
    drawBorder?: boolean;
    display?: boolean;
  };
  offset?: boolean;
  title?: {
    display?: boolean;
    color?: string;
    font?: IFont;
    align?: 'start' | 'center' | 'end';
    position?: 'top' | 'left' | 'bottom' | 'right';
  };
  ticks?: {
    color?: string;
    padding?: number;
    maxRotation?: number;
    minRotation?: number;
  };
}

interface IScales {
  y?: IScale;
  x?: IScale;
}

interface IInteraction {
  display?: boolean;
  mode?: 'index' | 'point' | 'nearest' | 'x' | 'y' | 'dataset';
  intersect?: boolean;
}

interface ILayout {
  display?: boolean;
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

interface IFill {
  enabled?: boolean;
  type?: 'start' | 'end' | 'origin' | 'disabled';
  color?: string;
  opacity?: number;
}

export interface IWidgetTheme extends Document {
  name: string;
  description: string;
  organizationId: Schema.Types.ObjectId;
  createdBy: Schema.Types.ObjectId;
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
  createdAt: Date;
  updatedAt: Date;
}

const fontSchema = new Schema<IFont>(
  {
    size: { type: Number },
    family: { type: String },
    weight: { type: String },
  },
  { _id: false }
);

const titleSchema = new Schema<ITitle>(
  {
    display: { type: Boolean, default: true },
    color: { type: String },
    font: fontSchema,
    align: {
      type: String,
      enum: ['start', 'center', 'end'],
    },
    position: {
      type: String,
      enum: ['top', 'left', 'bottom', 'right'],
    },
  },
  { _id: false }
);

const legendLabelsSchema = new Schema<ILegendLabels>(
  {
    color: { type: String },
    font: {
      size: { type: Number },
      family: { type: String },
    },
    usePointStyle: { type: Boolean, default: true },
    padding: { type: Number, default: 15 },
    boxWidth: { type: Number, default: 10 },
    boxHeight: { type: Number, default: 10 },
  },
  { _id: false }
);

const legendSchema = new Schema<ILegend>(
  {
    display: { type: Boolean, default: true },
    position: {
      type: String,
      enum: ['top', 'left', 'bottom', 'right', 'chartArea'],
    },
    labels: legendLabelsSchema,
    maxHeight: { type: Number, default: 100 },
  },
  { _id: false }
);

const tooltipSchema = new Schema<ITooltip>(
  {
    display: { type: Boolean, default: true },
    backgroundColor: { type: String },
    titleColor: { type: String },
    bodyColor: { type: String },
    borderColor: { type: String },
    borderWidth: { type: Number, default: 1 },
    padding: { type: Number, default: 12 },
    usePointStyle: { type: Boolean, default: true },
    displayColors: { type: Boolean, default: true },
  },
  { _id: false }
);

const scaleSchema = new Schema<IScale>(
  {
    display: { type: Boolean, default: true },
    beginAtZero: { type: Boolean, default: true },
    title: titleSchema,
    offset: { type: Boolean, default: false },
    type: {
      type: String,
      enum: ['linear', 'logarithmic', 'time', 'category'],
    },
    position: {
      type: String,
      enum: ['top', 'left', 'bottom', 'right'],
    },
    grid: {
      color: { type: String },
      drawBorder: { type: Boolean, default: false },
      display: { type: Boolean, default: true },
    },
    ticks: {
      color: { type: String },
      padding: { type: Number, default: 8 },
      maxRotation: { type: Number, default: 45 },
      minRotation: { type: Number, default: 45 },
    },
  },
  { _id: false }
);

const scalesSchema = new Schema<IScales>(
  {
    y: scaleSchema,
    x: scaleSchema,
  },
  { _id: false }
);

const interactionSchema = new Schema<IInteraction>(
  {
    display: { type: Boolean, default: true },
    mode: {
      type: String,
      enum: ['index', 'point', 'nearest', 'x', 'y', 'dataset'],
      default: 'index',
    },
    intersect: { type: Boolean, default: false },
  },
  { _id: false }
);

const layoutSchema = new Schema<ILayout>(
  {
    display: { type: Boolean, default: true },
    padding: {
      top: { type: Number, default: 0 },
      right: { type: Number, default: 0 },
      bottom: { type: Number, default: 10 },
      left: { type: Number, default: 0 },
    },
  },
  { _id: false }
);

const fillSchema = new Schema<IFill>(
  {
    enabled: { type: Boolean, default: false },
    type: {
      type: String,
      enum: ['start', 'end', 'origin', 'disabled', 'Smooth'],
      default: 'start',
    },
    color: { type: String },
    opacity: { type: Number, default: 0.2 },
  },
  { _id: false }
);

const widgetThemeSchema = new Schema<IWidgetTheme>(
  {
    name: { type: String, required: true },
    description: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
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
  },
  {
    timestamps: true,
  }
);

const WidgetTheme = model<IWidgetTheme>('widget_theme', widgetThemeSchema);

export default WidgetTheme;
