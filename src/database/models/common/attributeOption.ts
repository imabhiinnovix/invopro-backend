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
    createdBy: { type: Schema.Types.ObjectId, ref: 'user' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'user' },
    isActive: { type: Boolean, required: true },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

attributeSchema.index(
  { attributeName: 1, organizationId: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

// Create the attribute model
const AttributeOption = model<IAttribute>('attribute_option', attributeSchema);

export default AttributeOption;
