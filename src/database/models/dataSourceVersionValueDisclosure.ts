import { Schema, model, Document, Types } from 'mongoose';

// Interface for TypeScript
interface IDataSourceVersionValueDisclosure extends Document {
  entityId: Types.ObjectId;
  dataSourceId: Types.ObjectId;
  dataSourceVersionId: Types.ObjectId;
  DisclosureNumber: string;
  SBU: string;
  BU: string;
  BL: string;
  DisclosureDate?: Date;
  DisclosureStatus?: string;
  DisclosureTitle?: string;
  OwnerName: string;
  Attorney?: string;
  ProcedureAgentName?: string;
  OriginalSTCs?: string;
  AccoladeID_List?: string;
  Inventors?: string;
  Accolade?: string;
  OriginalSTCName?: string;
  ResponsibleSTCName?: string;
  ResponsibleSTCName1?: string;
  createdBy?: Types.ObjectId;
}

// Mongoose Schema
const dataSourceVersionValueDisclosureSchema = new Schema<IDataSourceVersionValueDisclosure>(
  {
    entityId: { type: Schema.Types.ObjectId, ref: 'Enity' },
    dataSourceId: { type: Schema.Types.ObjectId, ref: 'DataSource' },
    dataSourceVersionId: { type: Schema.Types.ObjectId, ref: 'DataSourceVersion' },
    DisclosureNumber: { type: String },
    SBU: { type: String },
    BU: { type: String },
    BL: { type: String },
    DisclosureDate: { type: Date },
    DisclosureStatus: { type: String },
    DisclosureTitle: { type: String },
    OwnerName: { type: String },
    Attorney: { type: String },
    ProcedureAgentName: { type: String },
    OriginalSTCs: { type: String },
    AccoladeID_List: { type: String },
    Inventors: { type: String },
    Accolade: { type: String },
    OriginalSTCName: { type: String },
    ResponsibleSTCName: { type: String },
    ResponsibleSTCName1: { type: String },
    createdBy: { type: Schema.Types.ObjectId },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt timestamps
  }
);

// Export the model
const DataSourceVersionValueDisclosure = model<IDataSourceVersionValueDisclosure>(
  'data_sabiac_disclosure',
  dataSourceVersionValueDisclosureSchema
);

export default DataSourceVersionValueDisclosure;
