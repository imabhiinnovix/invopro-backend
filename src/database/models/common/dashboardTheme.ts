import { Schema, model, Document, Types } from 'mongoose';

export interface IDashboardTheme extends Document {
  name: string;
  description?: string;
  colors: any; // You can replace `any` with a stricter type if needed
  typography: any;
  components: any;
  shadows: Record<string, string>;
  layout: {
    maxWidth: string;
  };
  dashboardFont: Types.ObjectId;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  organizationId: Types.ObjectId;
}

const ColorSchema = new Schema(
  {
    main: String,
    light: String,
    dark: String,
    contrastText: String,
  },
  { _id: false }
);

const ColorsSchema = new Schema(
  {
    primary: ColorSchema,
    secondary: ColorSchema,
    inputText: String,
    inputBorder: String,
    dropdownBg: String,
    dropdownBorder: String,
    dropdownOptionBg: String,
    dropdownOptionText: String,
    dropdownSelectedText: String,
    dropdownLabelColor: String,
    dropdownFocusedBorder: String,
    dropdownFocusedLabel: String,
    iconPrimary: String,
    background: {
      default: String,
      paper: String,
      surface: String,
      hover: String,
      card: String,
      dropdown: String,
    },
    text: {
      primary: String,
      secondary: String,
      disabled: String,
      hint: String,
    },
    divider: String,
    border: String,
    borderHover: String,
  },
  { _id: false }
);

const TypographySchema = new Schema(
  {
    fontFamily: String,
    fontSize: String,
    fontWeight: String,
    headings: {
      fontFamily: String,
      fontSize: String,
      fontWeight: String,
    },
    body: {
      fontFamily: String,
      fontSize: String,
      fontWeight: String,
    },
    buttons: {
      fontFamily: String,
      fontSize: String,
      fontWeight: String,
    },
    cards: {
      fontFamily: String,
      fontSize: String,
      fontWeight: String,
    },
    inputs: {
      fontFamily: String,
      fontSize: String,
      fontWeight: String,
    },
    tables: {
      fontFamily: String,
      fontSize: String,
      fontWeight: String,
    },
    navigation: {
      fontFamily: String,
      fontSize: String,
      fontWeight: String,
    },
    dialog: {
      fontFamily: String,
      fontSize: String,
      fontWeight: String,
    },
  },
  { _id: false }
);

const ComponentsSchema = new Schema(
  {
    button: { textTransform: String },
    card: { boxShadow: String },
    paper: { boxShadow: String },
    input: {
      borderColor: String,
      focusBorderColor: String,
      focusBorderColorFallback: String,
    },
    table: {
      boxShadow: String,
      headerBackground: String,
      headerText: String,
      rowOddBackground: String,
      rowEvenBackground: String,
      rowHoverBackground: String,
      rowText: String,
      borderColor: String,
    },
    navigation: {
      backgroundColor: String,
      textColor: String,
      activeBackground: String,
      activeTextColor: String,
      hoverBackground: String,
      hoverTextColor: String,
    },
    sidebar: {
      backgroundColor: String,
      textColor: String,
      activeBackground: String,
      activeTextColor: String,
      hoverBackground: String,
      hoverTextColor: String,
    },
    header: {
      backgroundColor: String,
      textColor: String,
      boxShadow: String,
    },
    dialog: {
      backgroundColor: String,
      borderColor: String,
      boxShadow: String,
      borderRadius: String,
      titleColor: String,
      titleFontSize: String,
      titleFontWeight: String,
      contentColor: String,
      contentFontSize: String,
      overlayColor: String,
      titleFontFamily: String,
    },
  },
  { _id: false }
);

const DashboardThemeSchema = new Schema<IDashboardTheme>(
  {
    name: { type: String, required: true },

    description: { type: String },
    colors: ColorsSchema,
    typography: TypographySchema,
    components: ComponentsSchema,
    shadows: { type: Map, of: String },
    layout: {
      maxWidth: String,
    },
    organizationId: { type: Schema.Types.ObjectId, ref: 'organization' },

    dashboardFont: { type: Schema.Types.ObjectId, ref: 'dashboard_font' },

    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const DashboardThemeModel = model<IDashboardTheme>('DashboardTheme', DashboardThemeSchema);
