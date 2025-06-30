import mongoose, { Schema, model, Document, Types } from 'mongoose';

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
  uiStartTableColumn?: number;
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
  cellFormat: string;
  isRequired: boolean;
  lastCellBackGroundColor: string;
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

interface IFilterSection {
  sheetCode: string;
  section: string;
  attribute: string;
  columns: IColumn[];
}

interface IReportSetting {
  sheetName: string;
  sheetCode: string;
  isWhiteBackGround: boolean;
  startTableColumn: string;
  startRowNumber: number;
}

export interface ICustomReport extends Document {
  reportName: string;
  reportCode: string;
  functionName: string;
  dataSourceIds: IDataSource[];
  organizationId: Types.ObjectId;
  sampleFilePath: string;
  filters: IFilterSection[];
  reportSettings: IReportSetting[];
  design: Record<string, Record<string, ISection[]>>;
  intermediateReportId: Types.ObjectId;
  isVisible: boolean;
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
  uiStartTableColumn: { type: Number },
});
const ColumnSchema = new Schema<IColumn>({
  reportHeader: { type: String, required: true },
  attributeValues: { type: [String], required: true },
});

const filterSectionSchema = new Schema<IFilterSection>({
  sheetCode: { type: String, required: true },
  section: { type: String, required: true },
  attribute: { type: String, required: true },
  columns: { type: [ColumnSchema], required: true },
});

const SubSectionSchema = new Schema<ISubSection>({
  headerName: { type: String },
  fontBold: { type: Boolean },
  headerBackGroundColor: { type: String },
  headerTextColor: { type: String },
  horizontalAlignment: { type: String },
  verticalAlignment: { type: String },
  type: { type: String },
  spanColumns: { type: Boolean },
  cellFormat: { type: String },
  isRequired: { type: Boolean },
  lastCellBackGroundColor: { type: String },
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
  view: { type: String },
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
    reportCode: { type: String, required: true },
    sampleFilePath: { type: String },
    dataSourceIds: [
      {
        code: { type: String, required: true },
        dataSourceId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'data_source' },
        fileDetails: { type: [{ name: String, sheetName: String, isRequired: Boolean }] },
        isRequired: { type: Boolean },
        entityId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Entity' },
      },
    ],
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    filters: { type: [filterSectionSchema] },
    reportSettings: { type: [ReportSettingSchema], required: true },
    intermediateReportId: { type: mongoose.Schema.Types.ObjectId },
    isVisible: { type: Boolean },
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

CustomReportSchema.index(
  { reportCode: 1, organizationId: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);
const CustomReportModel = model<ICustomReport>('custom_reports', CustomReportSchema);

export default CustomReportModel;
