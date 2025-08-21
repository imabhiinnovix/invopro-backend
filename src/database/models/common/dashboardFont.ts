import { Schema, model, Document, Types } from 'mongoose';

export interface IFont extends Document {
  name: string;
  filePath: string;
  organizationId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DashboardFontSchema = new Schema<IFont>(
  {
    name: { type: String, required: true },
    filePath: { type: String, required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'organization' },
  },
  { timestamps: true }
);

export const DashboardFontModel = model<IFont>('dashboard_font', DashboardFontSchema);
