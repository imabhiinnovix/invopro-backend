import { Schema, model, Document } from 'mongoose';
import config from '../../config';

interface IWidgetType extends Document {
  name: string;
  description: string;
  chartType: string;
  type: string;
  code: string;
  isActive: boolean;
}

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
  },
  {
    timestamps: true,
  }
);

WidgetTypeSchema.index({ name: 1, code: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export default model<IWidgetType>('widget_type', WidgetTypeSchema);
