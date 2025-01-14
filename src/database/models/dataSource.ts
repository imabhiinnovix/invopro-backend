import { Schema, model, Document, Types } from 'mongoose';

interface IDataSource extends Document {
  organizationId: Types.ObjectId;
  entityId: Types.ObjectId;
  name: string;
  code: string;
  versionType: string;
  description: string;
  updatedBy?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  isActive: boolean;
}

const dataSourceSchema = new Schema<IDataSource>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    entityId: { type: Schema.Types.ObjectId, ref: 'Entity' },
    name: { type: String, required: true },
    description: { type: String },
    code: { type: String, required: true },
    versionType: { type: String, required: true },
    isActive: { type: Boolean, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

dataSourceSchema.index({ code: 1, organizationId: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

const DataSource = model<IDataSource>('DataSource', dataSourceSchema);

export default DataSource;
