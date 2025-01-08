import { Schema, model, Types, Document } from 'mongoose';

// Interface for TypeScript
interface IDataSourceVersionValuePortfolio extends Document {
  dataSourceVersionId: Types.ObjectId;
  CaseNumber?: string;
  Case_Reference1?: string;
  Country?: string;
  Case_Type?: string;
  Sub_Case?: string;
  SBU?: string;
  BU?: string;
  BL?: string;
  Attorney?: string;
  IsFirstFiling?: number;
  In_Force?: number;
  Status?: string;
  Status_Date?: Date;
  Priority_Info?: string;
  Filing_Date?: Date;
  PCT_Date?: Date;
  Exp_Date?: Date;
  Grant_Date?: Date;
  Application_No?: string;
  PCT_No?: string;
  Publication_No?: string;
  Grant_No?: string;
  Annuity_Agent?: string;
  Local_Agent?: string;
  Procedure_Agent?: string;
  Procedure_Agent_Ref?: string;
  Title?: string;
  Legal_Owner?: string;
  Inventors?: string;
  Local_Agent_Ref?: string;
  Applicants?: string;
  Registered_Owner?: string;
  Original_STCs?: string;
  Accolade_ID_List?: string;
  AccoladeID?: string;
  Publication_Date?: Date;
  Country_Name?: string;
}

// Mongoose Schema
const dataSourceVersionValuePortfolioSchema = new Schema<IDataSourceVersionValuePortfolio>(
  {
    dataSourceVersionId: { type: Schema.Types.ObjectId, ref: 'DataSourceVersion', required: true },
    CaseNumber: { type: String },
    Case_Reference1: { type: String },
    Country: { type: String },
    Case_Type: { type: String },
    Sub_Case: { type: String },
    SBU: { type: String },
    BU: { type: String },
    BL: { type: String },
    Attorney: { type: String },
    IsFirstFiling: { type: Number },
    In_Force: { type: Number },
    Status: { type: String },
    Status_Date: { type: Date },
    Priority_Info: { type: String },
    Filing_Date: { type: Date },
    PCT_Date: { type: Date },
    Exp_Date: { type: Date },
    Grant_Date: { type: Date },
    Application_No: { type: String },
    PCT_No: { type: String },
    Publication_No: { type: String },
    Grant_No: { type: String },
    Annuity_Agent: { type: String },
    Local_Agent: { type: String },
    Procedure_Agent: { type: String },
    Procedure_Agent_Ref: { type: String },
    Title: { type: String },
    Legal_Owner: { type: String },
    Inventors: { type: String },
    Local_Agent_Ref: { type: String },
    Applicants: { type: String },
    Registered_Owner: { type: String },
    Original_STCs: { type: String },
    Accolade_ID_List: { type: String },
    AccoladeID: { type: String },
    Publication_Date: { type: Date },
    Country_Name: { type: String },
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
