import { Schema, model, Types, Document } from 'mongoose';

// Interface for TypeScript
interface IRowData {
  CaseNumber?: string;
  Case_Reference1?: string;
  Country?: string;
  CaseType?: string;
  SubCase?: string;
  SBU?: string;
  BU?: string;
  BL?: string;
  Attorney?: string;
  IsFirstFiling?: number;
  InForce?: number;
  Status?: string;
  StatusDate?: Date;
  PriorityInfo?: string;
  FilingDate?: Date;
  PCTDate?: Date;
  ExpDate?: Date;
  GrantDate?: Date;
  ApplicationNo?: string;
  PCTNo?: string;
  PublicationNo?: string;
  GrantNo?: string;
  AnnuityAgent?: string;
  LocalAgent?: string;
  ProcedureAgent?: string;
  ProcedureAgentRef?: string;
  Title?: string;
  LegalOwner?: string;
  Inventors?: string;
  LocalAgentRef?: string;
  Applicants?: string;
  RegisteredOwner?: string;
  OriginalSTCs?: string;
  AccoladeID_List?: string;
  AccoladeID?: string;
  PublicationDate?: Date;
  CountryName?: string;
}

// Main interface
interface IDataSourceVersionValuePortfolio extends Document {
  entityId: Types.ObjectId;
  dataSourceId: Types.ObjectId;
  dataSourceVersionId: Types.ObjectId;
  rowData: IRowData;
  createdBy?: Types.ObjectId;
  createdAt?: Date; // Automatically added by timestamps
  updatedAt?: Date; // Automatically added by timestamps
}

// Mongoose Schema
const dataSourceVersionValuePortfolioSchema = new Schema<IDataSourceVersionValuePortfolio>(
  {
    entityId: { type: Schema.Types.ObjectId, ref: 'Enity' },
    dataSourceId: { type: Schema.Types.ObjectId, ref: 'DataSource' },
    dataSourceVersionId: { type: Schema.Types.ObjectId, ref: 'DataSourceVersion' },
    rowData: {
      CaseNumber: { type: String },
      Case_Reference1: { type: String },
      Country: { type: String },
      CaseType: { type: String },
      SubCase: { type: String },
      SBU: { type: String },
      BU: { type: String },
      BL: { type: String },
      Attorney: { type: String },
      IsFirstFiling: { type: Number },
      InForce: { type: Number },
      Status: { type: String },
      StatusDate: { type: Date },
      PriorityInfo: { type: String },
      FilingDate: { type: Date },
      PCTDate: { type: Date },
      ExpDate: { type: Date },
      GrantDate: { type: Date },
      ApplicationNo: { type: String },
      PCTNo: { type: String },
      PublicationNo: { type: String },
      GrantNo: { type: String },
      AnnuityAgent: { type: String },
      LocalAgent: { type: String },
      ProcedureAgent: { type: String },
      ProcedureAgentRef: { type: String },
      Title: { type: String },
      LegalOwner: { type: String },
      Inventors: { type: String },
      LocalAgentRef: { type: String },
      Applicants: { type: String },
      RegisteredOwner: { type: String },
      OriginalSTCs: { type: String },
      AccoladeID_List: { type: String },
      AccoladeID: { type: String },
      PublicationDate: { type: Date },
      CountryName: { type: String },
    },
    createdBy: { type: Schema.Types.ObjectId },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt timestamps
  }
);

// Export the model
const DataSourceVersionValuePortfolio = model<IDataSourceVersionValuePortfolio>(
  'data_sabiac_portfolio',
  dataSourceVersionValuePortfolioSchema
);

export default DataSourceVersionValuePortfolio;
