// plotTypes.config.ts

export type PlotType =
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "quarterly";   // only one quarterly option


export interface PlotTypeConfig {
  type: PlotType;
  label: string;
  valueFormat: string;

  // quarter month ranges inside a single object
  monthRange?: {
    q1: [number, number]; // 0-based months
    q2: [number, number];
    q3: [number, number];
    q4: [number, number];
  };
}

export const plotTypesConfig: PlotTypeConfig[] = [
  {
    type: "daily",
    label: "Daily",
    valueFormat: "YYYY-MM-DD",
  },
  {
    type: "weekly",
    label: "Weekly",
    valueFormat: "YYYY-MM-DD~YYYY-MM-DD",
  },
  {
    type: "monthly",
    label: "Monthly",
    valueFormat: "YYYY-MM",
  },

  // ----------------------------------------
  // SINGLE QUARTERLY OPTION
  // ----------------------------------------
  {
    type: "quarterly",
    label: "Quarterly",
    valueFormat: "YYYY-Q",
    monthRange: {
      q1: [0, 2],   // Jan–Mar
      q2: [3, 5],   // Apr–Jun
      q3: [6, 8],   // Jul–Sep
      q4: [9, 11],  // Oct–Dec
    },
  },

  {
    type: "yearly",
    label: "Yearly",
    valueFormat: "YYYY",
  },
];

// Helper
export const getPlotTypeConfig = (type: PlotType): PlotTypeConfig | undefined => {
  return plotTypesConfig.find((pt) => pt.type === type);
};