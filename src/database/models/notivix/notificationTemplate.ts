import { Schema, model, Types, Document } from 'mongoose';

export interface INotificationTemplate extends Document {
  organizationId?: Types.ObjectId | null;
  userId?: Types.ObjectId;
  name: string;
  code: string;
  subject: string;
  body: string;
  type: string;
}

const notificationTemplateSchema = new Schema<INotificationTemplate>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },               // e.g., 'Overall Summary'
    code: { type: String, unique: true, required: true }, // e.g., 'overall_summary'
    subject: { type: String, required: true },            // e.g., 'Reminder for {{name}}'
    body: { type: String, required: true },               // HTML or text body with placeholders
    type: {
      type: String,
      enum: ['single', 'overall'], // single = one record, overall = multiple/cumulative
      default: 'single',
    },
  },
  {
    timestamps: true, // createdAt and updatedAt managed automatically
  }
);

export default model<INotificationTemplate>('notification_template', notificationTemplateSchema);
