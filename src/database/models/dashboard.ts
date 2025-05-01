import { Schema, model, Document, Types } from 'mongoose';

interface IDashboard extends Document {
  createdBy: Types.ObjectId;
  organizationId: Types.ObjectId;
  widgetThemeId: Types.ObjectId;
  name: string;
  description: string;
  isDeleted: boolean;
  isActive: boolean;
  isShareble: boolean;
  settings: {
    columnsGrid: number;
    dashBoardType: 'trend' | 'normal';
    startVersionValue: string;
    endVersionValue: string;
    dynamicVersionValue: '12m' | '6m' | '3m' | '1m';
  };
}

const dashboardSchema = new Schema<IDashboard>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    widgetThemeId: { type: Schema.Types.ObjectId, ref: 'widget_theme' },
    name: { type: Schema.Types.String },
    description: { type: Schema.Types.String },
    isDeleted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, required: true },
    isShareble: { type: Boolean, default: false, required: true },
    settings: {
      type: Schema.Types.Mixed,
      default: {
        columnsGrid: 2,
        dashBoardType: 'normal',
        startVersionValue: '',
        endVersionValue: '',
        dynamicVersionValue: '1m',
      },
    },
  },
  {
    timestamps: true,
  }
);

dashboardSchema.index({ createdBy: 1, name: 1 }, { unique: true });

export default model<IDashboard>('dashboard', dashboardSchema);
