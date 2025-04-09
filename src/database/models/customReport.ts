import { Schema, model, Document, Types } from 'mongoose';

interface IDataSource {
  code: string;
  dataSourceId: string;
  fileDetails: { name: string; sheetName: string; isRequired: boolean }[];
  isRequired: boolean;
}

interface IColumn {
  reportHeader: string;
  attributeValues: string[];
}

interface ISubSection {
  headerName: string;
  headerBackGroundColor: string;
  headerColor: string;
  horizontalAlignment: string;
  verticalAlignment: string;
  type: string;
  spanColumns: boolean;
  format: string;
}

interface ISection {
  sectionName: string;
  sectionBackGroundColor: string;
  sectionColor: string;
  sectionHorizontalAlignment: string;
  sectionVerticalAlignment: string;
  spanColumns: boolean;
  subSections: ISubSection[];
}

interface IHeaderSection {
  section: string;
  attribute: string;
  columns: IColumn[];
}

interface ICustomReport extends Document {
  reportName: string;
  functionName: string;
  dataSourceIds: IDataSource[];
  organizationId: Types.ObjectId;
  sampleFilePath: string;
  headers: Record<string, IHeaderSection>;
  sections: ISection[];
}

const ColumnSchema = new Schema<IColumn>({
  reportHeader: { type: String, required: true },
  attributeValues: { type: [String], required: true },
});

const HeaderSectionSchema = new Schema<IHeaderSection>({
  section: { type: String, required: true },
  attribute: { type: String, required: true },
  columns: { type: [ColumnSchema], required: true },
});

const SubSectionSchema = new Schema<ISubSection>({
  headerName: { type: String, required: true },
  headerBackGroundColor: { type: String, required: true },
  headerColor: { type: String, required: true },
  horizontalAlignment: { type: String, required: true },
  verticalAlignment: { type: String, required: true },
  type: { type: String, required: true },
  spanColumns: { type: Boolean, required: true },
  format: { type: String },
});

const SectionSchema = new Schema<ISection>({
  sectionName: { type: String, required: true },
  sectionBackGroundColor: { type: String, required: true },
  sectionColor: { type: String, required: true },
  sectionHorizontalAlignment: { type: String, required: true },
  sectionVerticalAlignment: { type: String, required: true },
  spanColumns: { type: Boolean, required: true },
  subSections: { type: [SubSectionSchema], required: true },
});

const CustomReportSchema = new Schema<ICustomReport>(
  {
    reportName: { type: String, required: true },
    functionName: { type: String, required: true },
    sampleFilePath: { type: String },
    dataSourceIds: [
      {
        code: { type: String, required: true },
        dataSourceId: { type: String, required: true, ref: 'data_source' },
        fileDetails: { type: [{ name: String, sheetName: String, isRequired: Boolean }] },
        isRequired: { type: Boolean },
      },
    ],
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    headers: { type: Map, of: HeaderSectionSchema },
    sections: { type: [SectionSchema] },
  },
  {
    timestamps: true,
  }
);

const CustomReportModel = model<ICustomReport>('custom_reports', CustomReportSchema);

export default CustomReportModel;
