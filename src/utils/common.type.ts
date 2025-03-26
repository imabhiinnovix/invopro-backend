export interface ReportHeaders {
  [key: string]: {
    section: string;
    attribute: string;
    columns: {
      reportHeader: string;
      attributeValues: string[];
    }[];
  };
}
