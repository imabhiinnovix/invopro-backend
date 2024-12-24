import { Schema, model, Document, Types } from 'mongoose';

// Define the IAttribute interface
interface IAttribute extends Document {
  attributeName: string;
  attributeValue: string[];
  organizationId: Types.ObjectId;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isActive: boolean;
}

// Define the attribute Schema
const attributeSchema = new Schema<IAttribute>(
  {
    attributeName: { type: String, required: true },
    attributeValue: { type: [String] },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, required: true },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  },
);

// Create the attribute model
const Attribute = model<IAttribute>('Attribute', attributeSchema);

export default Attribute;
