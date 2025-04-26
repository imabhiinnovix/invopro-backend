import { getSchemaNameBasedOnVersionCodeAndOrgCode } from './common.utils';
import { generateExcelReport } from './excel.utils';
import * as dataSourceVersionValueService from '../database/services/defaultDataSourceVersionValue.services';
import * as reportRequestService from '../database/services/reportRequest.services';

export function processReportHeaders({
  data,
  headers,
  totalColumnName,
}: {
  data: Record<string, any>[];
  headers: { reportHeader: string; attributeValues: string[] }[];
  isTotal?: boolean;
  totalColumnName?: string;
}) {
  try {
    return data.map((entry) => {
      const processedEntry: Record<string, string | number> = {};
      let total = 0;

      headers.forEach(({ reportHeader, attributeValues }) => {
        let sum = 0;
        let concatenatedString = '';
        let hasValidValue = false;

        attributeValues.forEach((attr) => {
          if (Object.prototype.hasOwnProperty.call(entry, attr)) {
            const value = entry[attr];
            const numValue = Number(value);

            if (!isNaN(numValue)) {
              sum += numValue;
              hasValidValue = true;
            } else if (typeof value === 'string') {
              concatenatedString += concatenatedString ? `, ${value}` : value;
              hasValidValue = true;
            }
          }
        });

        if (concatenatedString) {
          processedEntry[reportHeader] = concatenatedString;
        } else if (hasValidValue) {
          processedEntry[reportHeader] = sum;
          total += sum;
        } else {
          processedEntry[reportHeader] = '';
        }
      });

      if (totalColumnName && totalColumnName.length > 0) {
        processedEntry[totalColumnName] = total;
      }
      return processedEntry;
    });
  } catch (e) {
    console.log('Error in processReportHeaders.', e);
    throw e;
  }
}

export function transformMonthlyIpData({
  currentYear,
  isReverseMapping,
}: {
  currentYear: number;
  isReverseMapping?: boolean;
}) {
  const mapping = {
    SBU: 'SBU',
    'First Filings': 'First Filings',
    'Current Year New Apps Filed': `${currentYear} New Apps Filed`,
    'Percentage of Current Year Invention Disclosures converted to Filings': `% of ${currentYear} Invention Disclosures converted to Filings`,
    'Current Year New Apps Estimate': `${currentYear} New Apps Estimate`,
    'Previous Year New Apps Filed': `${currentYear - 1} New Apps filed`,
    'Two Years Ago New Apps Filed': `${currentYear - 2} New Apps filed`,
    'Three Years Ago New Apps Filed': `${currentYear - 3} New Apps filed`,
    'Four Years Ago New Apps Filed': `${currentYear - 4} New Apps filed`,
    Disclosures: 'Disclosures',
    'Apps Being Drafted': `Apps Being Drafted`,
    'Current Year Projects Opened': `Projects Opened in ${currentYear}`,
    'Previous Year Projects Opened': `Projects Opened in ${currentYear - 1}`,
    'Two Years Ago Projects Opened': `Projects Opened in ${currentYear - 2}`,
    'Three Years Ago Projects Opened': `Projects Opened in ${currentYear - 3}`,
    'Four Years Ago Projects Opened': `Projects Opened in ${currentYear - 4}`,
    'Total Active Projects': `Total Active Projects`,
    'Current Year Issued': `${currentYear} Issued`,
    'Current Year US Issued': `${currentYear} US Issued`,
    'Current Year Intl Issued': `${currentYear} Intl Issued`,
    'Pending Applications': 'Pending Applications',
    'Total US Apps pending': `Total US Apps pending`,
    'Total EP Apps pending': `Total EP Apps pending`,
    'Total CN Apps pending': `Total CN Apps pending`,
    'Other Country Apps pending': `Other Country Apps pending`,
    'Total Apps pending': `Total Apps pending`,
    'Issued Patents': 'Issued Patents',
    'Total US Issued': `Total US Issued`,
    'Total EP Issued': `Total EP Issued`,
    'Total CN Issued': `Total CN Issued`,
    'Other Country Issued': `Other Country Issued`,
    'Total Issued': `Total Issued`,
    'Total Portfolio (Apps Pending Plus Issued)': `Total Portfolio: Apps Pending+ Issued`,
    'Percentage of Total Portfolio': `% of Total Portfolio`,
    'Current Year Renewals Due': `${currentYear} Renewals Due`,
    'Total No of Current Year Reductions (Including reductions during prosecution)': `Total No. of ${currentYear}** Reductions (Including reductions during prosecution)`,
    'Current Year Annuity Savings from Current Year reductions': `${currentYear} Annuity Savings from ${currentYear} reductions`,
    'Next Year Annuity Savings from Current Year reductions': `${currentYear + 1} Annuity Savings from ${currentYear} reductions`,
    'Current Year-Next Year Annuity Savings from Current reductions': `${currentYear}-${currentYear + 1} Annuity Savings from ${currentYear} reductions`,
    'Number of Prosecution reductions in Current Year': `No. of Prosecution reductions in ${currentYear}`,
    'Prosecution cost Savings': 'Prosecution cost Savings',
    'Total Cost Savings (Current Year-Next Year) Annuity Savings Plus Prosecution savings from Current reductions': `Total Cost Savings: (${currentYear}-${currentYear + 1}) Annuity Savings + Prosecution savings from ${currentYear} reductions`,
  };
  if (isReverseMapping) {
    const reverseMapping = Object.fromEntries(Object.entries(mapping).map(([key, value]) => [value, key]));
    return reverseMapping;
  }
  return mapping;
}

export function transformMonthlySTCData({
  currentYear,
  isReverseMapping,
}: {
  currentYear: number;
  isReverseMapping?: boolean;
}) {
  const mapping = {
    STC: 'STC',
    'New Projects opened in Current Year': `New Projects opened in ${currentYear}`,
    'Total Open Projects': `Total Open Projects`,
    'Current Year Filed': `${currentYear} Filed`,
  };
  if (isReverseMapping) {
    const reverseMapping = Object.fromEntries(Object.entries(mapping).map(([key, value]) => [value, key]));
    return reverseMapping;
  }
  return mapping;
}

export function transformMonthlySTCSBUData({
  currentYear,
  isReverseMapping,
}: {
  currentYear: number;
  isReverseMapping?: boolean;
}) {
  const mapping = {
    SBU: 'SBU',
    'New Projects opened in Current Year': `New Projects opened in ${currentYear}`,
    'Total Open Projects': `Total Open Projects`,
    'Current Year Filed': `${currentYear} Filed`,
  };
  if (isReverseMapping) {
    const reverseMapping = Object.fromEntries(Object.entries(mapping).map(([key, value]) => [value, key]));
    return reverseMapping;
  }
  return mapping;
}

type MappingParams = {
  currentYear: number;
  isReverseMapping?: boolean;
};

export const transformFunctionsMap: Record<string, (params: MappingParams) => Record<string, string>> = {
  transformMonthlyIpData: ({ currentYear, isReverseMapping }) => {
    const mapping = {
      SBU: 'SBU',
      'First Filings': 'First Filings',
      'Current Year New Apps Filed': `${currentYear} New Apps Filed`,
      'Percentage of Current Year Invention Disclosures converted to Filings': `% of ${currentYear} Invention Disclosures converted to Filings`,
      'Current Year New Apps Estimate': `${currentYear} New Apps Estimate`,
      'Previous Year New Apps Filed': `${currentYear - 1} New Apps filed`,
      'Two Years Ago New Apps Filed': `${currentYear - 2} New Apps filed`,
      'Three Years Ago New Apps Filed': `${currentYear - 3} New Apps filed`,
      'Four Years Ago New Apps Filed': `${currentYear - 4} New Apps filed`,
      Disclosures: 'Disclosures',
      'Apps Being Drafted': `Apps Being Drafted`,
      'Current Year Projects Opened': `Projects Opened in ${currentYear}`,
      'Previous Year Projects Opened': `Projects Opened in ${currentYear - 1}`,
      'Two Years Ago Projects Opened': `Projects Opened in ${currentYear - 2}`,
      'Three Years Ago Projects Opened': `Projects Opened in ${currentYear - 3}`,
      'Four Years Ago Projects Opened': `Projects Opened in ${currentYear - 4}`,
      'Total Active Projects': `Total Active Projects`,
      'Current Year Issued': `${currentYear} Issued`,
      'Current Year US Issued': `${currentYear} US Issued`,
      'Current Year Intl Issued': `${currentYear} Intl Issued`,
      'Pending Applications': 'Pending Applications',
      'Total US Apps pending': `Total US Apps pending`,
      'Total EP Apps pending': `Total EP Apps pending`,
      'Total CN Apps pending': `Total CN Apps pending`,
      'Other Country Apps pending': `Other Country Apps pending`,
      'Total Apps pending': `Total Apps pending`,
      'Issued Patents': 'Issued Patents',
      'Total US Issued': `Total US Issued`,
      'Total EP Issued': `Total EP Issued`,
      'Total CN Issued': `Total CN Issued`,
      'Other Country Issued': `Other Country Issued`,
      'Total Issued': `Total Issued`,
      'Total Portfolio (Apps Pending Plus Issued)': `Total Portfolio: Apps Pending+ Issued`,
      'Percentage of Total Portfolio': `% of Total Portfolio`,
      'Current Year Renewals Due': `${currentYear} Renewals Due`,
      'Total No of Current Year Reductions (Including reductions during prosecution)': `Total No. of ${currentYear}** Reductions (Including reductions during prosecution)`,
      'Current Year Annuity Savings from Current Year reductions': `${currentYear} Annuity Savings from ${currentYear} reductions`,
      'Next Year Annuity Savings from Current Year reductions': `${currentYear + 1} Annuity Savings from ${currentYear} reductions`,
      'Current Year-Next Year Annuity Savings from Current reductions': `${currentYear}-${currentYear + 1} Annuity Savings from ${currentYear} reductions`,
      'Number of Prosecution reductions in Current Year': `No. of Prosecution reductions in ${currentYear}`,
      'Prosecution cost Savings': 'Prosecution cost Savings',
      'Total Cost Savings (Current Year-Next Year) Annuity Savings Plus Prosecution savings from Current reductions': `Total Cost Savings: (${currentYear}-${currentYear + 1}) Annuity Savings + Prosecution savings from ${currentYear} reductions`,
    };
    return isReverseMapping ? Object.fromEntries(Object.entries(mapping).map(([k, v]) => [v, k])) : mapping;
  },

  transformMonthlySTCData: ({ currentYear, isReverseMapping }) => {
    const mapping = {
      STC: 'STC',
      'New Projects opened in Current Year': `New Projects opened in ${currentYear}`,
      'Total Open Projects': `Total Open Projects`,
      'Current Year Filed': `${currentYear} Filed`,
    };
    return isReverseMapping ? Object.fromEntries(Object.entries(mapping).map(([k, v]) => [v, k])) : mapping;
  },
  transformMonthlySTCSBUData: ({ currentYear, isReverseMapping }) => {
    const mapping = {
      SBU: 'SBU',
      'New Projects opened in Current Year': `New Projects opened in ${currentYear}`,
      'Total Open Projects': `Total Open Projects`,
      'Current Year Filed': `${currentYear} Filed`,
    };
    return isReverseMapping ? Object.fromEntries(Object.entries(mapping).map(([k, v]) => [v, k])) : mapping;
  },
};

export async function generateCustomReportBasedOnReportRequestId({
  reportRequestId,
  orgCode,
}: {
  reportRequestId: string;
  orgCode: string;
}) {
  try {
    const reportDetails: any = await reportRequestService.findReportRequestById(reportRequestId, [
      { path: 'customReportId', select: 'reportName reportSettings design' },
    ]);

    const reportData = {};
    const designData = {};
    const reportSettings = reportDetails?.customReportId?.reportSettings;
    const designSettings = reportDetails?.customReportId?.design;
    const dataSourceVersions = reportDetails?.dataSourceVersion;
    const versionValue = reportDetails?.versionValue || '';
    const currentYearVersionValue = versionValue.split('-')[0];
    const reportName = reportDetails.customReportId.reportName;
    const fileName = reportDetails.fileName;
    const filePath = reportDetails.filePath;

    if (reportDetails?.status !== 'completed') {
      throw new Error(`The report is currently in '${reportDetails?.status}' status and cannot be downloaded.`);
    }

    if (dataSourceVersions && dataSourceVersions.length > 0) {
      let mappings: Record<string, any> = {};
      let designDetails: any[] = [];
      for (let i = 0; i < dataSourceVersions.length; i++) {
        const dataSourceVersion = dataSourceVersions[i];
        const sheetCode = dataSourceVersion.sheetCode;
        const designCode = dataSourceVersion.designCode;
        const versionCode = dataSourceVersion.versionCode;
        const dataSourceVersionId = dataSourceVersion.dataSourceVersionId;
        const mappingFuctionName = dataSourceVersion.mappingFuctionName;
        const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
          orgCode: orgCode,
          versionCode: versionCode,
        });
        const query = { dataSourceVersionId: dataSourceVersionId };

        const dataSourceVersionData = await dataSourceVersionValueService.getDataSourceVersionValue({
          schemaName,
          query,
          page: 1,
          select: 'rowData',
          limit: Number.MAX_SAFE_INTEGER,
        });

        designDetails = JSON.parse(JSON.stringify(designSettings.get(sheetCode)));

        const mappingFunc = transformFunctionsMap[mappingFuctionName];

        if (mappingFunc) {
          mappings = mappingFunc({ currentYear: currentYearVersionValue, isReverseMapping: false }) || {};
        }
        const transformedVersionData = dataSourceVersionData.data.map((entry) => {
          const newRow = {};
          const rowData = entry.rowData;

          if (Object.keys(mappings).length === 0) {
            // No mappings provided, keep original keys
            Object.entries(rowData).forEach(([key, value]) => {
              newRow[key] = value !== undefined ? value : null;
            });
          } else {
            // Apply mappings
            for (const [originalKey, mappedKey] of Object.entries(mappings)) {
              newRow[mappedKey] = rowData[originalKey] !== undefined ? rowData[originalKey] : null;
            }
          }

          return { ...newRow };
        });

        const isMappingEmpty = Object.keys(mappings).length === 0;

        const transformedDesignData = designDetails[designCode]?.map((section) => {
          const transformedSectionName = isMappingEmpty
            ? section.sectionName
            : mappings[section.sectionName] || section.sectionName;

          const updatedSubSections = section.subSections.map((sub) => ({
            ...sub,
            headerName: isMappingEmpty ? sub.headerName : mappings[sub.headerName] || sub.headerName,
          }));

          return {
            ...section,
            sectionName: transformedSectionName,
            subSections: updatedSubSections,
          };
        });

        if (reportData[sheetCode]) {
          reportData[sheetCode].push(transformedVersionData);
        } else {
          reportData[sheetCode] = [transformedVersionData];
        }
        if (designData[sheetCode]) {
          designData[sheetCode] = [...designData[sheetCode], ...transformedDesignData];
        } else {
          designData[sheetCode] = transformedDesignData;
        }
      }
    } else {
      throw new Error(`Data not found.`);
    }

    await generateExcelReport({
      reportName,
      reportData,
      designData: designData,
      reportSettings,
      filePath: filePath,
    });

    return { filePath, fileName };
  } catch (e) {
    console.log('Errror in generateCustomReportBasedOnReportRequestId', e);
    throw e;
  }
}
