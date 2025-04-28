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

interface IComments {
  comment: string;
  backGroundColor: string;
  horizontalAlignment: string;
  verticalAlignment: string;
  startTableColumn: string;
  textColor: string;
  fontBold: boolean;
  isBorder: boolean;
  mergeCell: number;
}

interface ISubSection {
  headerName: string;
  fontBold: boolean;
  headerBackGroundColor: string;
  headerTextColor: string;
  horizontalAlignment: string;
  verticalAlignment: string;
  type: string;
  spanColumns: boolean;
  format: string;
  isRequired: boolean;
}

interface ISection {
  sectionName: string;
  fontBold: boolean;
  comments: IComments[];
  sectionBackGroundColor: string;
  sectionTextColor: string;
  sectionHorizontalAlignment: string;
  sectionVerticalAlignment: string;
  spanColumns: boolean;
  subSections: ISubSection[];
  view: string;
  space: number;
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
  reportSettings: IReportSetting[];
  design: Record<string, Record<string, ISection[]>>;
}

interface IReportSetting {
  sheetName: string;
  sheetCode: string;
  isWhiteBackGround: boolean;
  startTableColumn: string;
  startRowNumber: number;
}
const CommentSchema = new Schema<IComments>({
  comment: { type: String, required: true },
  backGroundColor: { type: String },
  horizontalAlignment: { type: String },
  verticalAlignment: { type: String },
  startTableColumn: { type: String },
  textColor: { type: String },
  fontBold: { type: Boolean },
  isBorder: { type: Boolean },
  mergeCell: { type: Number },
});
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
  fontBold: { type: Boolean },
  headerBackGroundColor: { type: String, required: true },
  headerTextColor: { type: String, required: true },
  horizontalAlignment: { type: String, required: true },
  verticalAlignment: { type: String, required: true },
  type: { type: String, required: true },
  spanColumns: { type: Boolean, required: true },
  format: { type: String },
  isRequired: { type: Boolean },
});

const SectionSchema = new Schema<ISection>({
  sectionName: { type: String },
  fontBold: { type: Boolean },
  sectionBackGroundColor: { type: String },
  sectionTextColor: { type: String },
  comments: { type: [CommentSchema] },
  sectionHorizontalAlignment: { type: String },
  sectionVerticalAlignment: { type: String },
  spanColumns: { type: Boolean },
  subSections: { type: [SubSectionSchema] },
  space: { type: Number },
  view: { type: String, required: true },
});

const ReportSettingSchema = new Schema<IReportSetting>({
  sheetName: { type: String, required: true },
  sheetCode: { type: String, required: true },
  isWhiteBackGround: { type: Boolean, required: true },
  startTableColumn: { type: String, required: true },
  startRowNumber: { type: Number, required: true },
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
    reportSettings: { type: [ReportSettingSchema], required: true },
    design: {
      type: Map,
      of: {
        type: Map,
        of: [SectionSchema],
      },
    },
  },
  {
    timestamps: true,
  }
);

const CustomReportModel = model<ICustomReport>('custom_reports', CustomReportSchema);

export default CustomReportModel;
