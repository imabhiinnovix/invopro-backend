// widget_theme_overrides.schema.ts (using Mongoose + TypeScript)
import { Schema, model, Types } from 'mongoose';

const WidgetAppearanceSchema = new Schema(
  {
    dashboardId: { type: Types.ObjectId, ref: 'dashboards', required: true },
    dashboardWidgetId: { type: Types.ObjectId, ref: 'dashboard_widgets', required: true },
    createdBy: { type: Types.ObjectId, ref: 'users', required: true },
    organizationId: { type: Types.ObjectId, ref: 'organizations', required: true },
    // Optional override properties
    title: {
      display: Boolean,
      color: String,
      font: {
        size: Number,
        family: String,
        weight: String,
      },
      align: String,
      position: String,
    },

    subtitle: {
      display: Boolean,
      color: String,
      font: {
        size: Number,
        family: String,
      },
      align: String,
      position: String,
    },

    legend: {
      display: Boolean,
      position: String,
      labels: {
        color: String,
        font: {
          size: Number,
          family: String,
        },
        usePointStyle: Boolean,
        padding: Number,
        boxWidth: Number,
        boxHeight: Number,
      },
      maxHeight: Number,
    },

    tooltip: {
      display: Boolean,
      backgroundColor: String,
      titleColor: String,
      borderColor: String,
      borderWidth: Number,
      padding: Number,
      usePointStyle: Boolean,
      displayColors: Boolean,
    },

    scales: {
      x: Schema.Types.Mixed,
      y: Schema.Types.Mixed,
    },

    interaction: {
      display: Boolean,
      mode: String,
      intersect: Boolean,
    },

    layout: {
      display: Boolean,
      padding: {
        top: Number,
        right: Number,
        bottom: Number,
        left: Number,
      },
    },

    fill: {
      enabled: { type: Boolean, default: false },
      type: {
        type: String,
        enum: ['start', 'end', 'origin', 'disabled', 'Smooth'],
        default: 'start',
      },
      color: { type: String },
      opacity: { type: Number, default: 0.2 },
    },

    colors: [String],
    borderColor: [String],
    backgroundColor: [String],
    chartType: String,

    // Status fields
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default model('widget_appearance', WidgetAppearanceSchema);
