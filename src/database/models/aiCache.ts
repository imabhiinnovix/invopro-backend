import { Schema, model, Document, Types } from 'mongoose';

export interface IAiCache extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  code: string;
  cacheName: string;
  createdAt: string;
  updatedAt: string;
}

const aiCacheSchema = new Schema<IAiCache>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  code: { type: String, required: true },
  cacheName: { type: String, required: true },
  createdAt: { type: String },
  updatedAt: { type: String },
});

aiCacheSchema.index({ organizationId: 1, code: 1 }, { unique: true });

const AiCacheModel = model<IAiCache>('AiCache', aiCacheSchema);
export default AiCacheModel;
