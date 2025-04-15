import { Schema } from 'mongoose';

export interface IFont {
  size?: number;
  family?: string;
  weight?: string;
}

export interface ITitle {
  display?: boolean;
  color?: string;
  font?: IFont;
  align?: 'start' | 'center' | 'end';
  position?: 'top' | 'left' | 'bottom' | 'right';
}

export interface ILegendLabels {
  color?: string;
  font?: {
    size?: number;
    family?: string;
  };
  usePointStyle?: boolean;
  padding?: number;
  boxWidth?: number;
  boxHeight?: number;
}

export interface ILegend {
  display?: boolean;
  position?: 'top' | 'left' | 'bottom' | 'right' | 'chartArea';
  labels?: ILegendLabels;
  maxHeight?: number;
}

export interface ITooltip {
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

export interface IScale {
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

export interface IScales {
  y?: IScale;
  x?: IScale;
}

export interface IInteraction {
  display?: boolean;
  mode?: 'index' | 'point' | 'nearest' | 'x' | 'y' | 'dataset';
  intersect?: boolean;
}

export interface ILayout {
  display?: boolean;
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

export interface IFill {
  enabled?: boolean;
  type?: 'start' | 'end' | 'origin' | 'disabled' | 'Smooth';
  color?: string;
  opacity?: number;
}

// Schema Definitions
export const fontSchema = new Schema<IFont>(
  {
    size: { type: Number },
    // family: { type: String },
    weight: { type: String },
  },
  { _id: false }
);

export const titleSchema = new Schema<ITitle>(
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

export const legendLabelsSchema = new Schema<ILegendLabels>(
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

export const legendSchema = new Schema<ILegend>(
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

export const tooltipSchema = new Schema<ITooltip>(
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

export const scaleSchema = new Schema<IScale>(
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

export const scalesSchema = new Schema<IScales>(
  {
    y: scaleSchema,
    x: scaleSchema,
  },
  { _id: false }
);

export const interactionSchema = new Schema<IInteraction>(
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

export const layoutSchema = new Schema<ILayout>(
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

export const fillSchema = new Schema<IFill>(
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
