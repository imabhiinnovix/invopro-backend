import { Schema, model, Document, Types } from 'mongoose';

// Define the Attribute interface
interface IAttribute {
  name: string;
  type: 'number' | 'text' | 'date' | 'boolean' | 'richtext' | 'url' | 'option' | 'multioption' | 'user';
  validation?: string[];
  transformations?: string[];
  optionAttributeId?: string;
  cleaner?: string[];
}

// Define the IEntity interface
interface IEntity extends Document {
  name: string;
  description?: string;
  attributes?: IAttribute[]; // Optional array of attributes
  organizationId: Types.ObjectId;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  isActive: boolean;
}

// Define the Attribute Schema
const attributeSchema = new Schema<IAttribute>(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['number', 'text', 'date', 'boolean', 'richtext', 'url', 'option', 'multioption', 'user'],
    },
    validation: { type: [String] }, // Array of strings
    transformations: { type: [String] }, // Array of strings
    optionAttributeId: { type: String }, // Optional field
    cleaner: { type: [String] }, // Array of strings
  },
  { _id: false } // Disable _id for subdocuments in arrays
);

// Define the Entity Schema
const entitySchema = new Schema<IEntity>(
  {
    name: { type: String, required: true },
    description: { type: String },
    attributes: { type: [attributeSchema], default: [] }, // Array of attributes
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, required: true },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

entitySchema.index({ name: 1, organizationId: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

// Create the entity model
const Entity = model<IEntity>('Entity', entitySchema);

export default Entity;
