import { Schema, model, Document, Types } from 'mongoose';

// Subdocument interface for each attribute option
interface IAttributeValue {
  _id?: Types.ObjectId;   // auto-created by MongoDB for subdocs
  value: string;
}

// Main Attribute interface
interface IAttribute extends Document {
  attributeName: string;
  attributeValue: IAttributeValue[]; // array of subdocs
  organizationId: Types.ObjectId;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isActive: boolean;
}

// Sub-schema for attribute values
const attributeValueSchema = new Schema<IAttributeValue>(
  {
    value: { type: String, required: true },
  },
  { _id: true } // ensures _id is created for each value
);

// Define the attribute Schema
const attributeSchema = new Schema<IAttribute>(
  {
    attributeName: { type: String, required: true },
    attributeValue: [attributeValueSchema], // array of subdocs
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'user' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'user' },
    isActive: { type: Boolean, required: true },
  },
  {
    timestamps: true,
  }
);

attributeSchema.index(
  { attributeName: 1, organizationId: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

// Create the attribute model
const AttributeOption = model<IAttribute>('attribute_option', attributeSchema);

export default AttributeOption;