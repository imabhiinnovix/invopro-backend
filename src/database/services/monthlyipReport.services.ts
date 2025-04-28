import mongoose from 'mongoose';
import { DateTime } from 'luxon';
import { CustomReportModelAccessReturnType } from '../models/customReportModels';
import * as dataSourceVersionServices from '../../database/services/dataSourceVersion.services';
import { processReportHeaders } from '../../utils/common.report';

const ObjectId = mongoose.Types.ObjectId;

export interface DataItem {
  value: number | string;
  SBU: string;
  cellName?: string;
  numFormat?: string;
}

const epCountry = [
  'EM',
  'EU',
  'EP',
  'AL',
  'AT',
  'BE',
  'BG',
  'CH',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'ES',
  'FI',
  'FR',
  'GB',
  'GR',
  'HR',
  'HU',
  'IE',
  'IS',
  'IT',
  'LI',
  'LT',
  'LU',
  'LV',
  'MC',
  'ME',
  'MK',
  'MT',
  'NL',
  'NO',
  'PL',
  'PT',
  'RO',
  'RS',
  'SE',
  'SI',
  'SK',
  'SM',
  'TR',
  'UP',
  'BY',
];

export function processSTCData(data) {
  const mapping = {
    'stc houston': 'STC-HOUSTON',
    'stc geleen': 'STC-GELEEN',
    'stc shanghai': 'STC-Shanghai',
    'stc riyadh': 'STC-KSA',
    'stc bangalore': 'STC-Bangalore',
    'stc jubail': 'STC Jubail',
    'stc kaust cri': 'CRI Kaust ONLY',
    'research & technology riyadh': 'STC-KSA',
    'stc shpp': 'STC SHPP',
    'sabic technical center houston': 'STC-HOUSTON',
    'stc korea': 'STC-Korea',
    'stc eng. thermoplastics': 'STC-ENG THERM.',
    'sabic r&d europe': 'STC-GELEEN',
    'stc united-aff ksa': 'Aff',
    'stc aff hadeed': 'Aff',
    'stc jva yansab': 'Aff',
    'stc mount vernon': 'STC Mount Vernon',
    'stc bergen op zoom': 'STC Bergen op Zoom',
    'stc selkirk': 'STC Selkirk',
    'stc moka': 'STC Moka',
    yanpet: 'Aff', //not final
  };

  const result = {};

  let total = 0;
  data.forEach(({ value, STC }) => {
    STC.split(';').forEach((stc) => {
      let normalizedSTC = stc.trim()?.toLowerCase();
      let mappedSTC = mapping[normalizedSTC] || stc.trim();

      if (!result[mappedSTC]) {
        result[mappedSTC] = 0;
      }
      result[mappedSTC] += value;
      total += value;
    });
  });

  const finalResult = Object.entries(result).map(([STC, value]) => ({ STC, value }));
  finalResult.push({ STC: 'Totals', value: total });
  return finalResult;
}

export function getTotalPortfolioPercentage({ data }: { data: Record<string, any> }) {
  const item = data[0]; // Assuming only one item in the array
  const total = Number(item['Totals']) || 0;

  const percentageData: Record<string, any> = {};

  for (const key in item) {
    if (key === 'SBU') {
      percentageData[key] = item[key];
    } else if (key === 'Totals') {
      percentageData[key] = 1; // Total is 100% = 1 in percentage format
    } else {
      const rawValue = item[key];
      const numericValue = Number(rawValue);
      percentageData[key] = total > 0 && !isNaN(numericValue) ? numericValue / total : '';
    }
  }

  return percentageData;
}
export async function getTotalPortfolio({
  partiallyProcessedTotalPendingApplication,
  partiallyProcessedTotalIssuedApplication,
}: {
  partiallyProcessedTotalPendingApplication: Record<string, number | string>;
  partiallyProcessedTotalIssuedApplication: Record<string, number | string>;
}) {
  const dataMap: Record<string, any> = {};

  function processData(source: Record<string, number | string>) {
    for (const key in source) {
      if (key !== 'SBU') {
        const numericValue = Number(source[key]) || 0;
        dataMap[key] = (dataMap[key] || 0) + numericValue;
      }
    }
  }

  processData(partiallyProcessedTotalPendingApplication);
  processData(partiallyProcessedTotalIssuedApplication);

  return dataMap;
}

export function processData({
  data,
  cellMappings,
  isCellOnly,
  staticTotal = 0,
}: {
  data: DataItem[];
  cellMappings?: Record<string, string>;
  isCellOnly?: boolean;
  staticTotal?: number;
}): DataItem[] {
  // Define cell mappings and mergeable SBUs

  const mergeSBUs = ['SBU Polymers', 'SBU Temp Polymers Transfer (from Spec)', 'SBU PNJ Saudi Aramco-SABIC'];

  // Initialize totals
  let polymersCount = 0;
  let totalDistinctCount = 0;

  // Process data
  const processedData: DataItem[] = data
    .filter((item) => {
      // Handle merging SBUs into "SBU Polymers"
      if (mergeSBUs.includes(item.SBU)) {
        polymersCount += item.value as number;
        return false; // Exclude these items from the final list
      }
      return true;
    })
    .map((item) => {
      // Calculate total and assign cell names
      totalDistinctCount += item.value as number;
      return { ...item, cellName: cellMappings?.[item.SBU] };
    });

  // Add merged "SBU Polymers" data
  const polymersItem = {
    value: polymersCount,
    SBU: 'SBU Polymers',
    cellName: cellMappings?.['SBU Polymers'],
  };
  processedData.push(polymersItem);

  if (!isCellOnly) {
    totalDistinctCount += polymersCount;

    // Calculate petchem total
    // const petchemTotal = processedData
    //   .filter((item) => item.SBU === 'SBU Polymers' || item.SBU === 'SBU Chemicals')
    //   .reduce((sum, item) => sum + (item.value as number), 0);

    // Add totals to the processed data
    const totalValue = totalDistinctCount + staticTotal;
    processedData.push({
      value: Number.isInteger(totalValue) ? totalValue : Number(totalValue.toFixed(2)),
      SBU: 'Total',
      cellName: cellMappings?.Total,
    });
  }

  return processedData;
}

export function addCellMaping({
  data,
  cellMappings,
}: {
  data: DataItem[];
  cellMappings?: Record<string, string>;
}): DataItem[] {
  return data.map((item) => {
    return {
      SBU: item.SBU,
      value: item.value,
      cellName: cellMappings?.[item.SBU],
      numFormat: item.numFormat,
    };
  });
}

export async function getCurrentYearNewApplicationFiled({
  portfolioDataSourceVersionId,
  currentYear,
  isPercentagePart,
  isCurrentYearUSIssued,
  isCurrentYearINTIssued,
  isUSPendingApplication,
  isEPPendingApplication,
  isCNPendingApplication,
  isOtherPendingApplication,
  isTotalPendingApplication,
  isUSIssuedApplication,
  isEPIssuedApplication,
  isCNIssuedApplication,
  isOtherIssuedApplication,
  isTotalIssuedApplication,
  customReportModel,
  isRowData,
}: {
  portfolioDataSourceVersionId: string;
  currentYear: string;
  isPercentagePart?: boolean;
  isCurrentYearUSIssued?: boolean;
  isCurrentYearINTIssued?: boolean;
  isUSPendingApplication?: boolean;
  isEPPendingApplication?: boolean;
  isCNPendingApplication?: boolean;
  isOtherPendingApplication?: boolean;
  isTotalPendingApplication?: boolean;
  isUSIssuedApplication?: boolean;
  isEPIssuedApplication?: boolean;
  isCNIssuedApplication?: boolean;
  isOtherIssuedApplication?: boolean;
  isTotalIssuedApplication?: boolean;
  customReportModel: CustomReportModelAccessReturnType;
  isRowData?: boolean;
}) {
  try {
    const otherCountryNegative = [...epCountry, 'CN', 'US'];
    let matchCondition: Record<string, any> = {
      dataSourceVersionId: new ObjectId(portfolioDataSourceVersionId),
    };

    const yearDateRange = {
      $gte: `${currentYear}-01-01T00:00:00.000Z`,
      $lte: `${currentYear}-12-31T00:00:00.000Z`,
    };

    if (isCurrentYearUSIssued || isCurrentYearINTIssued) {
      matchCondition['rowData.Grant Date'] = yearDateRange;
      matchCondition['rowData.Status'] = {
        $nin: ['UNDER OPPOSITION', 'UNDEROPPOSITION', 'Under Opposition', 'UnderOpposition'],
      };
      if (isCurrentYearUSIssued) matchCondition['rowData.Country'] = { $in: ['US'] };
      if (isCurrentYearINTIssued) matchCondition['rowData.Country'] = { $nin: ['US'] };
      // matchCondition['rowData.In Force'] = 1; // Add In Force condition for issued applications
    } else if (
      isUSPendingApplication ||
      isEPPendingApplication ||
      isCNPendingApplication ||
      isOtherPendingApplication ||
      isTotalPendingApplication ||
      isUSIssuedApplication ||
      isEPIssuedApplication ||
      isCNIssuedApplication ||
      isOtherIssuedApplication ||
      isTotalIssuedApplication
    ) {
      if (isUSPendingApplication || isUSIssuedApplication) matchCondition['rowData.Country'] = { $in: ['US'] };
      else if (isEPPendingApplication || isEPIssuedApplication)
        matchCondition['rowData.Country'] = {
          $in: epCountry,
        };
      else if (isCNPendingApplication || isCNIssuedApplication) matchCondition['rowData.Country'] = { $in: ['CN'] };
      else if (isOtherPendingApplication || isOtherIssuedApplication)
        matchCondition['rowData.Country'] = {
          $nin: otherCountryNegative,
        };
      if (isTotalPendingApplication || isTotalIssuedApplication) delete matchCondition['rowData.Country']; // For total pending application, ignore country filter

      if (
        isUSIssuedApplication ||
        isEPIssuedApplication ||
        isCNIssuedApplication ||
        isOtherIssuedApplication ||
        isTotalIssuedApplication
      ) {
        matchCondition = {
          ...matchCondition,
          'rowData.In Force': 1,
          'rowData.Status': {
            $nin: ['Unfiled', 'UNFILED', 'Under Opposition', 'UNDER OPPOSITION', 'UnderOpposition'],
          },

          'rowData.Grant Date': { $ne: null }, // Checks if Grant Date is null
        };
      } else {
        matchCondition = {
          ...matchCondition,
          'rowData.In Force': 1,
          'rowData.Status': {
            $nin: ['Unfiled', 'UNFILED'],
          },
          $or: [
            {
              'rowData.Grant Date': { $exists: false }, // Checks if Grant Date is null
            },
            {
              $and: [
                {
                  'rowData.Status': {
                    $in: ['Under Opposition', 'UNDER OPPOSITION', 'UnderOpposition', 'underopposition'],
                  },
                },
                {
                  'rowData.Grant Date': { $exists: true }, // Ensures Grant Date is not null
                },
              ],
            },
          ],
        };
      }
    } else {
      matchCondition['rowData.IsFirstFiling'] = 1;
      matchCondition['rowData.Filing Date'] = yearDateRange;
    }

    if (isPercentagePart) {
      matchCondition['rowData.In Force'] = 1;
    }

    const aggreagatePipeline: any = [
      {
        $match: matchCondition,
      },

      // Group by rowData.Case_Reference1 and count distinct cases
      {
        $group: {
          _id: '$rowData.Case_Reference1',
          SBU: { $first: '$rowData.SBU' },
        },
      },
    ];
    if (!isRowData) {
      aggreagatePipeline.push({
        $group: {
          _id: '$SBU',
          value: { $sum: 1 },
        },
      });
      aggreagatePipeline.push({
        $project: {
          SBU: '$_id',
          _id: 0,
          value: 1,
        },
      });
    }
    const newYearApplicationFiled =
      await customReportModel.DataSourceVersionValuePortfolio.aggregate(aggreagatePipeline);
    return newYearApplicationFiled;
  } catch (error) {
    throw error;
  }
}

export async function getDisclosureCount({
  disclosureDataSourceVersionId,
  currentYear,
  isActive,
  isDrafted,
  isYearRequired,
  isPercentage,
  customReportModel,
  isRowData,
}: {
  disclosureDataSourceVersionId: string;
  currentYear: string;
  isActive: boolean;
  isDrafted: boolean;
  isYearRequired: boolean;
  isPercentage?: boolean;
  customReportModel: CustomReportModelAccessReturnType;
  isRowData?: boolean;
}) {
  try {
    const yearDateRange = {
      $gte: `${currentYear}-01-01T00:00:00.000Z`,
      $lte: `${currentYear}-12-31T00:00:00.000Z`,
    };

    const matchCondition = {
      dataSourceVersionId: new ObjectId(disclosureDataSourceVersionId),
    };

    if (isActive) {
      matchCondition['rowData.DisclosureStatus'] = {
        $in: [
          'Open',
          'Rated to Search',
          'Rated To Search',
          'Rated to Hold',
          'Rated To Hold',
          'Rated to Draft OC',
          'Rated To Draft OC',
          'Rated to Draft IH',
          'Rated To Draft IH',
          'Filing Requested',
          'RATED TO DRAFT IN HOUSE',
          'Submitted',
          'Review Rate to Draft',
        ],
      };
    }
    if (isDrafted) {
      matchCondition['rowData.DisclosureStatus'] = {
        $in: ['Rated To Draft OC', 'RATED TO DRAFT IN HOUSE', 'Rated To Draft IH'],
      };
    }
    if (isYearRequired) {
      matchCondition['rowData.DisclosureDate'] = yearDateRange;
    }
    if (isPercentage) {
      matchCondition['rowData.DisclosureStatus'] = {
        $in: [
          'Rated to Draft OC',
          'Rated To Draft OC',
          'Rated to Draft IH',
          'Rated To Draft IH',
          'RATED TO DRAFT IN HOUSE',
        ],
      };
    }

    const aggreagatePipeline: any = [
      {
        $match: matchCondition,
      },
      {
        $group: {
          _id: '$rowData.DisclosureNumber',
          SBU: { $first: '$rowData.SBU' },
        },
      },
    ];

    if (!isRowData) {
      aggreagatePipeline.push({
        $group: {
          _id: '$SBU',
          value: { $sum: 1 },
        },
      });
      aggreagatePipeline.push({
        $project: {
          SBU: '$_id',
          _id: 0,
          value: 1,
        },
      });
    }
    const activeDisclosure = await customReportModel.DataSourceVersionValueDisclosure.aggregate(aggreagatePipeline);

    return activeDisclosure;
  } catch (error) {
    throw error;
  }
}

export async function getProjectBasedOnStcs({
  disclosureDataSourceVersionId,
  currentYear,
  isActive,
  isDrafted,
  isYearRequired,
  customReportModel,
  isRowData,
}: {
  disclosureDataSourceVersionId: string;
  currentYear: string;
  isActive: boolean;
  isDrafted: boolean;
  isYearRequired: boolean;
  customReportModel: CustomReportModelAccessReturnType;
  isRowData?: boolean;
}) {
  try {
    const yearDateRange = {
      $gte: `${currentYear}-01-01T00:00:00.000Z`,
      $lte: `${currentYear}-12-31T00:00:00.000Z`,
    };

    const matchCondition = {
      dataSourceVersionId: new ObjectId(disclosureDataSourceVersionId),
      // 'rowData.OriginalSTCs': { $ne: null },
    };

    if (isActive) {
      matchCondition['rowData.DisclosureStatus'] = {
        $in: [
          'Open',
          'Rated to Search',
          'Rated To Search',
          'Rated to Hold',
          'Rated To Hold',
          'Rated to Draft OC',
          'Rated To Draft OC',
          'Rated to Draft IH',
          'Rated To Draft IH',
          'Filing Requested',
          'RATED TO DRAFT IN HOUSE',
          'Submitted',
          'Review Rate to Draft',
        ],
      };
    }
    if (isDrafted) {
      matchCondition['rowData.DisclosureStatus'] = {
        $in: ['Rated To Draft OC', 'RATED TO DRAFT IN HOUSE', 'Rated To Draft IH'],
      };
    }
    if (isYearRequired) {
      matchCondition['rowData.DisclosureDate'] = yearDateRange;
    }
    if (isRowData) {
      const activeDisclosure = await customReportModel.DataSourceVersionValueDisclosure.aggregate([
        {
          $match: matchCondition,
        },
        {
          $group: {
            _id: '$rowData.DisclosureNumber',
            OriginalSTCs: { $first: '$rowData.OriginalSTCs' },
          },
        },
        {
          $project: {
            _id: 0, // Exclude _id
            DisclosureNumber: '$_id', // Rename _id to DisclosureNumber
            OriginalSTCs: 1, // Keep OriginalSTCs
          },
        },
      ]);
      return activeDisclosure;
    } else {
      const activeDisclosure = await customReportModel.DataSourceVersionValueDisclosure.aggregate([
        {
          $match: matchCondition,
        },
        {
          $group: {
            _id: '$rowData.DisclosureNumber',
            OriginalSTCs: { $first: '$rowData.OriginalSTCs' },
          },
        },

        {
          $group: {
            _id: '$OriginalSTCs',
            value: { $sum: 1 },
          },
        },
        {
          $project: {
            STC: {
              $ifNull: ['$_id', 'Blank'], // Replace null with "Blank"
            },
            _id: 0,
            value: 1,
          },
        },
      ]);
      return activeDisclosure;
    }
  } catch (error) {
    throw error;
  }
}

export async function getAppsFiledBasedOnStc({
  portfolioDataSourceVersionId,
  currentYear,
  isPercentagePart,
  isCurrentYearUSIssued,
  isCurrentYearINTIssued,
  isUSPendingApplication,
  isEPPendingApplication,
  isCNPendingApplication,
  isOtherPendingApplication,
  isTotalPendingApplication,
  isUSIssuedApplication,
  isEPIssuedApplication,
  isCNIssuedApplication,
  isOtherIssuedApplication,
  isTotalIssuedApplication,
  customReportModel,
  isRowData,
}: {
  portfolioDataSourceVersionId: string;
  currentYear: string;
  isPercentagePart?: boolean;
  isCurrentYearUSIssued?: boolean;
  isCurrentYearINTIssued?: boolean;
  isUSPendingApplication?: boolean;
  isEPPendingApplication?: boolean;
  isCNPendingApplication?: boolean;
  isOtherPendingApplication?: boolean;
  isTotalPendingApplication?: boolean;
  isUSIssuedApplication?: boolean;
  isEPIssuedApplication?: boolean;
  isCNIssuedApplication?: boolean;
  isOtherIssuedApplication?: boolean;
  isTotalIssuedApplication?: boolean;
  customReportModel: CustomReportModelAccessReturnType;
  isRowData?: boolean;
}) {
  try {
    const epCountry = [
      'EM',
      'EU',
      'EP',
      'AL',
      'AT',
      'BE',
      'BG',
      'CH',
      'CY',
      'CZ',
      'DE',
      'DK',
      'EE',
      'ES',
      'FI',
      'FR',
      'GB',
      'GR',
      'HR',
      'HU',
      'IE',
      'IS',
      'IT',
      'LI',
      'LT',
      'LU',
      'LV',
      'MC',
      'ME',
      'MK',
      'MT',
      'NL',
      'NO',
      'PL',
      'PT',
      'RO',
      'RS',
      'SE',
      'SI',
      'SK',
      'SM',
      'TR',
      'UP',
      'BY',
    ];

    const otherCountryNegative = [...epCountry, 'CN', 'US'];
    let matchCondition: Record<string, any> = {
      dataSourceVersionId: new ObjectId(portfolioDataSourceVersionId),
      // 'rowData.Original STCs': { $ne: null },
    };

    const yearDateRange = {
      $gte: `${currentYear}-01-01T00:00:00.000Z`,
      $lte: `${currentYear}-12-31T00:00:00.000Z`,
    };

    if (isCurrentYearUSIssued || isCurrentYearINTIssued) {
      matchCondition['rowData.Grant Date'] = yearDateRange;
      matchCondition['rowData.Status'] = {
        $nin: ['UNDER OPPOSITION', 'UNDEROPPOSITION', 'Under Opposition', 'UnderOpposition'],
      };
      if (isCurrentYearUSIssued) matchCondition['rowData.Country'] = { $in: ['US'] };
      if (isCurrentYearINTIssued) matchCondition['rowData.Country'] = { $nin: ['US'] };
      // matchCondition['rowData.In Force'] = 1; // Add In Force condition for issued applications
    } else if (
      isUSPendingApplication ||
      isEPPendingApplication ||
      isCNPendingApplication ||
      isOtherPendingApplication ||
      isTotalPendingApplication ||
      isUSIssuedApplication ||
      isEPIssuedApplication ||
      isCNIssuedApplication ||
      isOtherIssuedApplication ||
      isTotalIssuedApplication
    ) {
      if (isUSPendingApplication || isUSIssuedApplication) matchCondition['rowData.Country'] = { $in: ['US'] };
      else if (isEPPendingApplication || isEPIssuedApplication)
        matchCondition['rowData.Country'] = {
          $in: epCountry,
        };
      else if (isCNPendingApplication || isCNIssuedApplication) matchCondition['rowData.Country'] = { $in: ['CN'] };
      else if (isOtherPendingApplication || isOtherIssuedApplication)
        matchCondition['rowData.Country'] = {
          $nin: otherCountryNegative,
        };
      if (isTotalPendingApplication || isTotalIssuedApplication) delete matchCondition['rowData.Country']; // For total pending application, ignore country filter

      if (
        isUSIssuedApplication ||
        isEPIssuedApplication ||
        isCNIssuedApplication ||
        isOtherIssuedApplication ||
        isTotalIssuedApplication
      ) {
        matchCondition = {
          ...matchCondition,
          'rowData.In Force': 1,
          'rowData.Status': {
            $nin: ['Unfiled', 'UNFILED', 'Under Opposition', 'UNDER OPPOSITION', 'UnderOpposition'],
          },

          'rowData.Grant Date': { $ne: null }, // Checks if Grant Date is null
        };
      } else {
        matchCondition = {
          ...matchCondition,
          'rowData.In Force': 1,
          'rowData.Status': {
            $nin: ['Unfiled', 'UNFILED'],
          },
          $or: [
            {
              'rowData.Grant Date': { $exists: false }, // Checks if Grant Date is null
            },
            {
              $and: [
                {
                  'rowData.Status': {
                    $in: ['Under Opposition', 'UNDER OPPOSITION', 'UnderOpposition', 'underopposition'],
                  },
                },
                {
                  'rowData.Grant Date': { $exists: true }, // Ensures Grant Date is not null
                },
              ],
            },
          ],
        };
      }
    } else {
      matchCondition['rowData.IsFirstFiling'] = 1;
      matchCondition['rowData.Filing Date'] = yearDateRange;
    }

    if (isPercentagePart) {
      matchCondition['rowData.In Force'] = 1;
    }

    if (isRowData) {
      const newYearApplicationFiled = await customReportModel.DataSourceVersionValuePortfolio.aggregate([
        {
          $match: matchCondition,
        },

        // Group by rowData.Case_Reference1 and count distinct cases
        {
          $group: {
            _id: '$rowData.Case_Reference1',
            'Original STCs': { $first: '$rowData.Original STCs' },
          },
        },
        {
          $project: {
            _id: 0, // Exclude _id
            Case_Reference1: '$_id', // Rename _id to DisclosureNumber
            'Original STCs': 1, // Keep OriginalSTCs
          },
        },
      ]);
      return newYearApplicationFiled;
    } else {
      const newYearApplicationFiled = await customReportModel.DataSourceVersionValuePortfolio.aggregate([
        {
          $match: matchCondition,
        },

        // Group by rowData.Case_Reference1 and count distinct cases
        {
          $group: {
            _id: '$rowData.Case_Reference1',
            'Original STCs': { $first: '$rowData.Original STCs' },
          },
        },
        // Count the distinct Case_Reference1 by SBU
        {
          $group: {
            _id: '$Original STCs',
            value: { $sum: 1 },
          },
        },
        {
          $project: {
            STC: {
              $ifNull: ['$_id', 'Blank'], // Replace null with "Blank"
            },
            _id: 0,
            value: 1,
          },
        },
      ]);
      return newYearApplicationFiled;
    }
  } catch (error) {
    throw error;
  }
}

const calculateCombinedPercentage = (
  newData: Record<string, string | number>[],
  activeData: Record<string, string | number>[],
  totalData: Record<string, string | number>[]
): Record<string, string | number> => {
  const result: Record<string, string | number> = {};

  // Assuming only one object per array
  const newEntry = newData[0];
  const activeEntry = activeData[0];
  const totalEntry = totalData[0];

  const keys = Object.keys(totalEntry);

  const percentageData: Record<string, string | number> = {};

  keys.forEach((key) => {
    const total = Number(totalEntry[key]) || 0;
    const newVal = Number(newEntry[key]) || 0;
    const activeVal = Number(activeEntry[key]) || 0;

    const combined = newVal + activeVal;
    const percentage = total ? combined / total : 0;

    percentageData[key] = percentage; // optional rounding
  });

  return percentageData;
};

export async function percentageOfCurrentYearInventionDisclosureConvertedToFilings({
  portfolioDataSourceVersionId,
  disclosureDataSourceVersionId,
  currentYear,
  customReportModel,
  isRowData,
  headers,
}: {
  portfolioDataSourceVersionId: string;
  disclosureDataSourceVersionId: string;
  currentYear: string;
  customReportModel: CustomReportModelAccessReturnType;
  isRowData?: boolean;
  headers: { reportHeader: string; attributeValues: string[] }[];
}) {
  try {
    // Use is row data true to generate the report
    const newYearApplicationFiledRowData = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: true,
      customReportModel,
      isRowData: true,
    });

    const newYearApplicationFiledStartsWith: string = currentYear.slice(-2);

    const newYearApplicationFiledFilteredData = newYearApplicationFiledRowData.filter((item: { _id: string }) =>
      item._id.startsWith(newYearApplicationFiledStartsWith)
    );

    const newYearApplicationFiledSbuCount: Record<string, number> = newYearApplicationFiledFilteredData.reduce(
      (acc: Record<string, number>, item: { SBU: string }) => {
        acc[item.SBU] = (acc[item.SBU] || 0) + 1;
        return acc;
      },
      {}
    );

    const newYearApplicationFiled = Object.entries(newYearApplicationFiledSbuCount).map(
      ([SBU, value]: [string, number]) => ({
        value,
        SBU,
      })
    );

    const activeDisclosureCount = await getDisclosureCount({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: false,
      isDrafted: false,
      isPercentage: true,
      isYearRequired: true,
      customReportModel,
      isRowData,
    });
    const totalDisclosureCount = await getDisclosureCount({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: false,
      isDrafted: false,
      isYearRequired: true,
      customReportModel,
      isRowData,
    });

    const newYearApplicationFiledRecord: Record<string, any> = {};
    for (let item of newYearApplicationFiled) {
      newYearApplicationFiledRecord[item.SBU] = (newYearApplicationFiledRecord[item.SBU] || 0) + item.value;
    }

    const activeDisclosureCountRecord: Record<string, any> = {};
    for (let item of activeDisclosureCount) {
      activeDisclosureCountRecord[item.SBU] = (activeDisclosureCountRecord[item.SBU] || 0) + item.value;
    }

    const totalDisclosureCountRecord: Record<string, any> = {};
    for (let item of totalDisclosureCount) {
      totalDisclosureCountRecord[item.SBU] = (totalDisclosureCountRecord[item.SBU] || 0) + item.value;
    }

    const processedNewYearApplicationFiled = processReportHeaders({
      data: [newYearApplicationFiledRecord],
      headers: headers,
      totalColumnName: 'Totals',
    });
    const processedActiveDisclosureCount = processReportHeaders({
      data: [activeDisclosureCountRecord],
      headers: headers,
      totalColumnName: 'Totals',
    });
    const processedTotalDisclosureCount = processReportHeaders({
      data: [totalDisclosureCountRecord],
      headers: headers,
      totalColumnName: 'Totals',
    });

    const result = calculateCombinedPercentage(
      processedNewYearApplicationFiled,
      processedActiveDisclosureCount,
      processedTotalDisclosureCount
    );

    return [{ SBU: `% of ${currentYear} Invention Disclosures converted to Filings`, ...result }];

    // if (isRowData) {
    //   return { newYearApplicationFiled, activeDisclosureCount, totalDisclosureCount };
    // }
  } catch (error) {
    throw error;
  }
}

export async function getCurrentYearRenewalDue({
  portfolioDataSourceVersionId,
  sabicipDataSourceVersionId,
  ctclinsabDataSourceVersionId,
  annuitiesbDataSourceVersionId,
  currentYear,
  customReportModel,
  isRowData,
}: {
  portfolioDataSourceVersionId: string;
  sabicipDataSourceVersionId: string;
  ctclinsabDataSourceVersionId: string;
  annuitiesbDataSourceVersionId: string;
  currentYear: string;
  customReportModel: CustomReportModelAccessReturnType;
  isRowData?: boolean;
}) {
  try {
    const yearDateRange = {
      $gte: `${currentYear}-01-01T00:00:00.000Z`,
      $lte: `${currentYear}-12-31T00:00:00.000Z`,
    };

    const sabicipData = await customReportModel.DataSourceVersionValueSabicips.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(sabicipDataSourceVersionId),
          'rowData.Renewal Date During Budget Period': yearDateRange,
          'rowData.Clients reference': { $exists: true },
        },
      },
      {
        $project: {
          _id: 1, // Include the `_id` field
          dataSourceVersionId: 1,
          rowData: 1,
        },
      },
    ]);

    const portfolioData = await customReportModel.DataSourceVersionValuePortfolio.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(portfolioDataSourceVersionId),
          'rowData.In Force': 1,
        },
      },
      {
        $group: {
          _id: '$rowData.Case_Reference1',
          SBU: { $first: '$rowData.SBU' },
          dataSourceVersionId: { $first: '$dataSourceVersionId' }, // Include these fields explicitly
          rowData: { $first: '$rowData' },
        },
      },
      {
        $project: {
          _id: 1, // Include the `_id` field
          dataSourceVersionId: 1,
          rowData: 1,
        },
      },
    ]);

    const mergedSabicIpPortFolioData = sabicipData.reduce((result, sabicItem) => {
      const matchingPortfolioItem = portfolioData.find(
        (portfolioItem) =>
          portfolioItem.rowData.Case_Reference1?.toLowerCase() === sabicItem.rowData['Clients reference']?.toLowerCase()
      );

      if (matchingPortfolioItem) {
        result.push({
          ...sabicItem.rowData,
          ...matchingPortfolioItem.rowData,
        });
      }

      return result;
    }, []);

    const uniqueSabicIpPortFolioData = mergedSabicIpPortFolioData.reduce((acc, current) => {
      const duplicate = acc.find(
        (item) => item.Case_Reference1?.toLowerCase() === current.Case_Reference1?.toLowerCase()
      );
      if (!duplicate) {
        acc.push(current);
      }
      return acc;
    }, []);

    const groupedSabicIpPortFolioData: any = uniqueSabicIpPortFolioData.reduce((acc, item) => {
      const sbu = item.SBU;
      if (!acc[sbu]) {
        acc[sbu] = {
          total: 0,
        };
      }

      acc[sbu].total += item.Total || 0;

      return acc;
    }, {});

    const groupedSabicIpPortFolioDataResult = Object.entries(groupedSabicIpPortFolioData).map(([SBU, data]) => ({
      SBU,
      value: (data as Record<string, any>).total,
    }));

    const ctclinsabData = await customReportModel.DataSourceVersionValueCtclinsabs.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(ctclinsabDataSourceVersionId),
          'rowData.Renewal Date During Budget Period': yearDateRange, // Ensure yearDateRange is properly defined
          'rowData.File number': { $exists: true },
        },
      },

      {
        $project: {
          _id: 1, // Include the `_id` field
          dataSourceVersionId: 1,
          rowData: 1,
        },
      },
    ]);

    const mergedCtclinSabPortFolioData = ctclinsabData?.reduce((result, ctclinsabItem) => {
      const matchingPortfolioItem = portfolioData.find(
        (portfolioItem) =>
          portfolioItem.rowData['Procedure Agent Ref']?.toLowerCase() ===
          ctclinsabItem.rowData['File number']?.toLowerCase()
      );

      if (matchingPortfolioItem) {
        result.push({
          ...ctclinsabItem.rowData,
          ...matchingPortfolioItem.rowData,
        });
      }
      return result;
    }, []);

    const uniqueCtclinSabPortFolioData = mergedCtclinSabPortFolioData?.reduce((acc, current) => {
      const duplicate = acc.find(
        (item) => item.Case_Reference1?.toLowerCase() === current.Case_Reference1?.toLowerCase()
      );
      if (!duplicate) {
        acc.push(current);
      }
      return acc;
    }, []);

    const groupedCtclPortFolioData: any = uniqueCtclinSabPortFolioData?.reduce((acc, item) => {
      const sbu = item.SBU;
      if (!acc[sbu]) {
        acc[sbu] = {
          total: 0,
        };
      }

      acc[sbu].total += item.Total || 0;

      return acc;
    }, {});

    const groupedCtclPortFolioDataResult = Object.entries(groupedCtclPortFolioData)?.map(([SBU, data]) => ({
      SBU,
      value: (data as Record<string, any>).total,
    }));

    const annuitiesData = await customReportModel.DataSourceVersionValueAnnuities.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(annuitiesbDataSourceVersionId),
          'rowData.Due Date': yearDateRange,
          // 'rowData.Other Reference No': { $exists: true },
        },
      },
      {
        $project: {
          _id: 1, // Include the `_id` field
          dataSourceVersionId: 1,
          rowData: 1,
        },
      },
    ]);

    const mergedAnnuitiesData = annuitiesData?.reduce((result, annuitiesItem) => {
      const matchingPortfolioItem = portfolioData.find(
        (portfolioItem) =>
          portfolioItem.rowData['Case_Reference1']?.toLowerCase() ===
          annuitiesItem.rowData['Other Reference No']?.toLowerCase()
      );

      if (matchingPortfolioItem) {
        result.push({
          ...annuitiesItem.rowData,
          ...matchingPortfolioItem.rowData,
        });
      }
      return result;
    }, []);

    const uniqueAnnuitiesData = mergedAnnuitiesData?.reduce((acc, current) => {
      const duplicate = acc.find(
        (item) => item.Case_Reference1?.toLowerCase() === current.Case_Reference1?.toLowerCase()
      );
      if (!duplicate) {
        acc.push(current);
      }
      return acc;
    }, []);

    const groupedAnnuitiesData: any = uniqueAnnuitiesData?.reduce((acc, item) => {
      const sbu = item.SBU;
      if (!acc[sbu]) {
        acc[sbu] = {
          Amount: 0,
        };
      }

      acc[sbu].Amount += item.Amount || 0;

      return acc;
    }, {});

    const groupedAnnuitiesDataResult = Object.entries(groupedAnnuitiesData)?.map(([SBU, data]) => ({
      SBU,
      value: (data as Record<string, any>).Amount,
    }));

    const combinedCurrentYearRenewalDueMap = new Map<string, number>();

    [groupedSabicIpPortFolioDataResult, groupedCtclPortFolioDataResult, groupedAnnuitiesDataResult].forEach(
      (dataset) => {
        dataset.forEach(({ SBU, value }) => {
          combinedCurrentYearRenewalDueMap.set(SBU, (combinedCurrentYearRenewalDueMap.get(SBU) || 0) + value);
        });
      }
    );

    const finalCurrentYearRenewalDueResult = Array.from(combinedCurrentYearRenewalDueMap, ([SBU, value]) => ({
      SBU,
      value: Number(value.toFixed(2)),
    }));
    if (isRowData) {
      return [...uniqueSabicIpPortFolioData, ...uniqueCtclinSabPortFolioData, ...uniqueAnnuitiesData];
    }

    return finalCurrentYearRenewalDueResult;
  } catch (e) {
    console.log('Error in getCurrentYearRenewalDue function');
    throw e;
  }
}

function filterCombineData(combinedCases, data) {
  const invalidTypes = ['PCT', 'EPP', 'ORD', 'EPT', 'NP', 'PCD', 'DIV', 'CNT', 'EAT', 'ETD', 'CIP', 'CON'];
  const invalidTypesRegex = new RegExp(`\\b(${invalidTypes.join('|')})\\b`);
  let result: any[] = [];

  for (let i = 0; i < data.length; i++) {
    const rowData = data[i].rowData;
    const dataFaimlyNumber = rowData.CaseNumber;
    const dataCaseRefrence = rowData['Case_Reference1'];
    const groupedCases = combinedCases[dataFaimlyNumber];

    const isInvalid = groupedCases.some((item) => {
      let finalMatch = false;
      if (item['Case_Reference1'] != dataCaseRefrence) {
        finalMatch = invalidTypesRegex.test(item['Case Type']);
        const match = item['Case_Reference1'].match(/\[(\d+)\]/);
        if (match && parseInt(match[1], 10) >= 2) {
          finalMatch = true;
        }
      }

      return finalMatch;
    });
    if (!isInvalid) {
      result.push(rowData);
    }
  }

  return result;
}

function filterProsecutionDrop(combinedCases, data) {
  let result: any[] = [];
  const invalidTypesRegex = new RegExp('WO-PCT|WO-ORD|WO-PRI');
  for (let i = 0; i < data.length; i++) {
    const rowData = data[i].rowData;
    const dataFaimlyNumber = rowData.CaseNumber;
    const dataCaseRefrence = rowData['Case_Reference1'];
    const groupedCases = combinedCases[dataFaimlyNumber];
    const isFirstFilling = rowData.IsFirstFiling;
    if (isFirstFilling === 1) {
      const isInvalid = groupedCases.some((item) => {
        let finalMatch = false;
        if (item['Case_Reference1'] != dataCaseRefrence) {
          finalMatch = invalidTypesRegex.test(item['Case_Reference1']);
        }
        if (finalMatch && item['In Force'] === 0) {
          finalMatch = false;
        }
        return finalMatch;
      });
      if (!isInvalid) {
        result.push(rowData);
      }
    } else {
      result.push(rowData);
    }
  }
  return result;
}
export async function getReductions({
  portfolioDataSourceVersionId,
  currentYear,
  customReportModel,
}: {
  portfolioDataSourceVersionId: string;
  currentYear: string;
  customReportModel: CustomReportModelAccessReturnType;
}) {
  try {
    const allCasesFromPortfolio = await customReportModel.DataSourceVersionValuePortfolio.aggregate([
      { $match: { dataSourceVersionId: new ObjectId(portfolioDataSourceVersionId) } },
    ]);

    const groupedCasesBasedOnFaimlyNumber = {};

    for (let i = 0; i < allCasesFromPortfolio.length; i++) {
      const rowData = allCasesFromPortfolio[i].rowData;

      if (groupedCasesBasedOnFaimlyNumber[rowData['CaseNumber']]) {
        groupedCasesBasedOnFaimlyNumber[rowData['CaseNumber']].push(rowData);
      } else {
        groupedCasesBasedOnFaimlyNumber[rowData['CaseNumber']] = [rowData];
      }
    }

    const yearDateRange = {
      $gte: `${currentYear}-01-01T00:00:00.000Z`,
      $lte: `${currentYear}-12-31T00:00:00.000Z`,
    };

    const currentStatus = ['Abandoned', 'Withdrawn', 'Inactive'];

    const annuityDropAggregate: any[] = [
      {
        $match: {
          dataSourceVersionId: new ObjectId(portfolioDataSourceVersionId),
          'rowData.Status Date': yearDateRange,
          'rowData.Status': { $in: currentStatus },
          'rowData.Case_Reference1': { $not: { $regex: 'CNRO' } },
          $or: [
            {
              'rowData.Country': { $nin: ['EP', 'EA'] },
            },
            {
              'rowData.Case Type': { $not: { $regex: 'EPT|EAT|PCT|ETD|EPD', $options: 'i' } },
            },
          ],

          $and: [
            {
              $or: [
                { 'rowData.Country': { $ne: 'WO' } },
                { $and: [{ 'rowData.Country': 'WO' }, { 'rowData.Case Type': { $ne: 'PRI' } }] },
              ],
            },
            { $or: [{ 'rowData.Grant Date': { $ne: null } }, { 'rowData.Grant No': { $ne: null } }] },
          ],
        },
      },
      {
        $group: {
          _id: '$rowData.Case_Reference1',
          SBU: { $first: '$rowData.SBU' },
          dataSourceVersionId: { $first: '$dataSourceVersionId' }, // Include these fields explicitly
          rowData: { $first: '$rowData' },
        },
      },
      {
        $project: {
          _id: 1, // Include the `_id` field
          dataSourceVersionId: 1,
          rowData: 1,
        },
      },
    ];

    const annuityDrop = await customReportModel.DataSourceVersionValuePortfolio.aggregate(annuityDropAggregate);

    const annuityDropArray = annuityDrop.map((data) => ({
      ...(data?.rowData || {}),
      dropType: 'annuity',
    }));

    const annuityDropCount = annuityDropArray.reduce((acc, item) => {
      const sbu = item['SBU'];
      acc[sbu] = (acc[sbu] || 0) + 1;
      return acc;
    }, {});

    const annuityDropCountResult = Object.entries(annuityDropCount).map(([SBU, value]) => ({ SBU, value }));

    const annuityDropCaseReference = annuityDropArray.map((data) => {
      return data.Case_Reference1;
    });

    const priorityDropAggregate: any[] = [
      {
        $match: {
          dataSourceVersionId: new ObjectId(portfolioDataSourceVersionId),
          'rowData.Status Date': yearDateRange,
          'rowData.Status': { $in: currentStatus },
          'rowData.Case_Reference1': {
            $not: { $regex: 'CNRO', $options: 'i' },
            $nin: [...annuityDropCaseReference],
          },
          $or: [
            { 'rowData.Country': { $ne: 'WO' } },
            { $and: [{ 'rowData.Country': 'WO' }, { 'rowData.Case Type': { $ne: 'PRI' } }] },
          ],
          $and: [
            {
              $and: [
                { 'rowData.Publication Date': { $eq: null } },
                { 'rowData.Grant Date': { $eq: null } },
                { 'rowData.Grant No': { $eq: null } },
                { 'rowData.Publication No': { $eq: null } },
              ],
            },
          ],
        },
      },
      {
        $group: {
          _id: '$rowData.Case_Reference1',
          SBU: { $first: '$rowData.SBU' },
          dataSourceVersionId: { $first: '$dataSourceVersionId' }, // Include these fields explicitly
          rowData: { $first: '$rowData' },
        },
      },
    ];

    const priorityDropUnfilteredWithDate =
      await customReportModel.DataSourceVersionValuePortfolio.aggregate(priorityDropAggregate);

    const groupedPriorityDropFiltered = filterCombineData(
      groupedCasesBasedOnFaimlyNumber,
      priorityDropUnfilteredWithDate
    );

    const priorityDropArray = groupedPriorityDropFiltered
      .filter((item) => {
        const statusDate = DateTime.fromISO(item['Status Date']);
        const filingDate = DateTime.fromISO(item['Filing Date']);

        const diffInMonths = statusDate.diff(filingDate, 'months').months;

        return diffInMonths <= 24 && item['IsFirstFiling'] === 1;
      })
      .map((item) => ({
        ...item,
        dropType: 'priority',
      }));

    const priorityDropCount = priorityDropArray.reduce((acc, item) => {
      const sbu = item['SBU'];
      acc[sbu] = (acc[sbu] || 0) + 1;
      return acc;
    }, {});
    const priorityDropCountResult = Object.entries(priorityDropCount).map(([SBU, value]) => ({ SBU, value }));

    const priorityDropCaseReference = priorityDropArray.map((data) => {
      return data.Case_Reference1;
    });

    const pctDropAggregate: any[] = [
      {
        $match: {
          dataSourceVersionId: new ObjectId(portfolioDataSourceVersionId),
          'rowData.Status Date': yearDateRange,
          'rowData.Status': { $in: currentStatus },
          'rowData.Case_Reference1': {
            $not: { $regex: 'CNRO', $options: 'i' },
            $nin: [...annuityDropCaseReference, ...priorityDropCaseReference],
          },
          $and: [{ 'rowData.Country': 'WO' }, { 'rowData.Case Type': { $ne: 'PRI' } }],
        },
      },
      {
        $group: {
          _id: '$rowData.Case_Reference1',
          SBU: { $first: '$rowData.SBU' },
          dataSourceVersionId: { $first: '$dataSourceVersionId' }, // Include these fields explicitly
          rowData: { $first: '$rowData' },
        },
      },
    ];

    const pctDrop = await customReportModel.DataSourceVersionValuePortfolio.aggregate(pctDropAggregate);

    const pctDropArray = filterCombineData(groupedCasesBasedOnFaimlyNumber, pctDrop).map((item) => ({
      ...item,
      dropType: 'pct',
    }));

    const pctDropCount = pctDropArray.reduce((acc, item) => {
      const sbu = item['SBU'];
      acc[sbu] = (acc[sbu] || 0) + 1;
      return acc;
    }, {});
    const pctDropCountResult = Object.entries(pctDropCount).map(([SBU, value]) => ({ SBU, value }));

    const pctDropCaseReference = pctDropArray.map((data) => {
      return data.Case_Reference1;
    });

    const prosecutionDropAggregate = [
      {
        $match: {
          dataSourceVersionId: new ObjectId(portfolioDataSourceVersionId),
          'rowData.Status Date': yearDateRange,
          'rowData.Status': { $in: currentStatus },
          'rowData.Case_Reference1': {
            $not: { $regex: 'CNRO', $options: 'i' },
            $nin: [...annuityDropCaseReference, ...priorityDropCaseReference, ...pctDropCaseReference],
          },

          $or: [{ 'rowData.Grant Date': { $eq: null } }, { 'rowData.Grant No': { $eq: null } }],
          $and: [
            {
              $or: [
                { 'rowData.Country': { $ne: 'WO' } },
                { $and: [{ 'rowData.Country': 'WO' }, { 'rowData.Case Type': { $ne: 'PRI' } }] },
              ],
            },
            {
              $or: [
                {
                  $and: [
                    { 'rowData.IsFirstFiling': 1 },
                    { 'rowData.Publication Date': { $ne: null } },
                    { 'rowData.Publication No': { $ne: null } },
                    // {
                    //   $or: [
                    //     { 'rowData.Case_Reference1': { $not: { $regex: 'WO-PCT|WO-ORD', $options: 'i' } } },
                    //     {
                    //       $and: [
                    //         { 'rowData.Case_Reference1': { $regex: 'WO-PCT|WO-ORD', $options: 'i' } },
                    //         { 'rowData.In Force': 0 },
                    //       ],
                    //     },
                    //   ],
                    // },
                  ],
                },
                {
                  $and: [
                    { 'rowData.IsFirstFiling': 0 },
                    {
                      $or: [
                        {
                          $and: [
                            { 'rowData.Case Type': { $regex: 'PCT', $options: 'i' } },
                            { 'rowData.Country': { $ne: 'WO' } },
                          ],
                        },
                        {
                          $and: [
                            { 'rowData.Case Type': { $regex: 'ORD|National Patent', $options: 'i' } },
                            { 'rowData.Country': { $ne: 'WO' } },
                          ],
                        },
                        { 'rowData.Case Type': { $regex: 'CON|DIV', $options: 'i' } },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      {
        $group: {
          _id: '$rowData.Case_Reference1',
          SBU: { $first: '$rowData.SBU' },
          dataSourceVersionId: { $first: '$dataSourceVersionId' },
          rowData: { $first: '$rowData' },
        },
      },
    ];

    const prosecutionDrop = await customReportModel.DataSourceVersionValuePortfolio.aggregate(prosecutionDropAggregate);
    // const prosecutionDropArray = prosecutionDrop.map((data) => data.rowData);
    const prosecutionDropArray = filterProsecutionDrop(groupedCasesBasedOnFaimlyNumber, prosecutionDrop).map(
      (item) => ({
        ...item,
        dropType: 'prosecution',
      })
    );

    const prosecutionDropCount = prosecutionDropArray.reduce((acc, item) => {
      const sbu = item['SBU'];
      acc[sbu] = (acc[sbu] || 0) + 1;
      return acc;
    }, {});
    const prosecutionDropCountResult = Object.entries(prosecutionDropCount).map(([SBU, value]) => ({ SBU, value }));

    const mergedSBU = {};

    const mergeValues = (arr) => {
      arr.forEach(({ SBU, value }) => {
        mergedSBU[SBU] = (mergedSBU[SBU] || 0) + value;
      });
    };

    // Merge all three arrays
    mergeValues(annuityDropCountResult);
    mergeValues(priorityDropCountResult);
    mergeValues(pctDropCountResult);
    mergeValues(prosecutionDropCountResult);

    // Convert merged object to array
    const dropCountResult = Object.entries(mergedSBU).map(([SBU, value]) => ({ SBU, value })) as DataItem[];

    return {
      annuityDropArray,
      priorityDropArray,
      pctDropArray,
      prosecutionDropArray,
      dropCountResult,
    };
  } catch (e) {
    console.log('Error in getReductionsAndCostSavings', e);
    throw e;
  }
}

export async function getAnnuitySavingsFromReductions({
  sabicipDataSourceVersionId,
  ctclinsabDataSourceVersionId,
  annuitiesbDataSourceVersionId,
  currentYear,
  annuityDrop,
  priorityDrop,
  pctDrop,
  prosecutionDrop,
  customReportModel,
  isRowData,
}: {
  sabicipDataSourceVersionId: string;
  ctclinsabDataSourceVersionId: string;
  annuitiesbDataSourceVersionId: string;
  currentYear: string;
  annuityDrop: any;
  priorityDrop: any;
  pctDrop: any;
  prosecutionDrop: any;
  customReportModel: CustomReportModelAccessReturnType;
  isRowData?: boolean;
}) {
  try {
    const yearDateRange = {
      $gte: `${currentYear}-01-01T00:00:00.000Z`,
      $lte: `${currentYear}-12-31T00:00:00.000Z`,
    };

    const combinedDrops = [...annuityDrop, ...priorityDrop, ...pctDrop, ...prosecutionDrop];

    const allDropCaseReference = combinedDrops.map((data) => data.Case_Reference1);

    const allDropProcedureAgentRef = combinedDrops.map((data) => data['Procedure Agent Ref']);

    const sbuTotals = {};

    const sabicipData = await customReportModel.DataSourceVersionValueSabicips.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(sabicipDataSourceVersionId),
          'rowData.Renewal Date During Budget Period': yearDateRange,
          'rowData.Clients reference': {
            $in: allDropCaseReference,
          },
        },
      },
      {
        $group: {
          _id: '$rowData.Clients reference',
          dataSourceVersionId: { $first: '$dataSourceVersionId' }, // Include these fields explicitly
          rowData: { $first: '$rowData' },
        },
      },
    ]);

    const sabicipMap = {};
    sabicipData.forEach((item) => {
      const clientRef = item.rowData['Clients reference']?.toLowerCase().trim();
      if (clientRef) {
        sabicipMap[clientRef] = item.rowData.Total ? item.rowData.Total : 0;
      }
    });

    const ctclinsabData = await customReportModel.DataSourceVersionValueCtclinsabs.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(ctclinsabDataSourceVersionId),
          'rowData.Renewal Date During Budget Period': yearDateRange,
          'rowData.File number': {
            $in: allDropProcedureAgentRef,
          },
        },
      },
      {
        $group: {
          _id: '$rowData.File number',
          dataSourceVersionId: { $first: '$dataSourceVersionId' }, // Include these fields explicitly
          rowData: { $first: '$rowData' },
        },
      },
    ]);

    const ctclinsabMap = {};

    ctclinsabData.forEach((item) => {
      const fileNumber = item.rowData['File number']?.toLowerCase().trim();
      if (fileNumber) {
        ctclinsabMap[fileNumber] = item.rowData.Total ? item.rowData.Total : 0;
      }
    });

    const annuitiesData = await customReportModel.DataSourceVersionValueAnnuities.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(annuitiesbDataSourceVersionId),
          'rowData.Due Date': yearDateRange,
          'rowData.Other Reference No': {
            $in: allDropCaseReference,
          },
        },
      },
      {
        $group: {
          _id: '$rowData.Other Reference No',
          dataSourceVersionId: { $first: '$dataSourceVersionId' }, // Include these fields explicitly
          rowData: { $first: '$rowData' },
        },
      },
    ]);

    const annuitiesMap = {};
    annuitiesData.forEach((item) => {
      const otherReferenceNo = item.rowData['Other Reference No']?.toLowerCase().trim();
      if (otherReferenceNo) {
        annuitiesMap[otherReferenceNo] = item.rowData.Amount ? item.rowData.Amount : 0;
      }
    });

    const rowDataSavings: any = [];

    combinedDrops.forEach((item) => {
      const caseRef = item.Case_Reference1?.toLowerCase().trim();
      const procedureAgentRef = item['Procedure Agent Ref']?.toLowerCase().trim();
      const sbu = item.SBU;
      const sabicTotal = sabicipMap[caseRef] || 0;
      const ctclinsabTotal = ctclinsabMap[procedureAgentRef] || 0;
      const annuitiesTotal = annuitiesMap[caseRef] || 0;
      const total = sabicTotal + ctclinsabTotal + annuitiesTotal;

      if (isRowData) {
        rowDataSavings.push({
          ...item,
          Case_Reference1: caseRef,
          dropType: item.dropType,
          AnnuitiesDueList_SHPP_Savings: sabicTotal,
          AnnuitiesDueList_Linde_Savings: ctclinsabTotal,
          AnnuitiesDueList_CPi_Savings: annuitiesTotal,
          Total_Saving: total,
        });
      }

      if (sbu) {
        if (!sbuTotals[sbu]) {
          sbuTotals[sbu] = 0;
        }
        sbuTotals[sbu] += total;
      }
    });

    if (isRowData) {
      return rowDataSavings;
    }

    const dropSavingResult = Object.entries(sbuTotals).map(([SBU, value]) => ({
      SBU,
      value: Number((value as number).toFixed(2)),
    })) as DataItem[];
    return dropSavingResult;
  } catch (e) {
    console.log('Error in getAnnuitySavingsFromReductions function.', e);
    throw e;
  }
}

export async function getNumberOfProsecutionReduction({
  priorityDrop,
  pctDrop,
  prosecutionDrop,
}: {
  priorityDrop: any;
  pctDrop: any;
  prosecutionDrop: any;
}) {
  try {
    const allProsecutionDrops = [...priorityDrop, ...pctDrop, ...prosecutionDrop];
    const allProsecutionDropCount = allProsecutionDrops.reduce((acc, item) => {
      const sbu = item['SBU'];
      acc[sbu] = (acc[sbu] || 0) + 1;
      return acc;
    }, {});
    const allProsecutionDropCountResult = Object.entries(allProsecutionDropCount).map(([SBU, value]) => ({
      SBU,
      value,
    })) as DataItem[];
    return allProsecutionDropCountResult;
  } catch (e) {
    console.log('Error in getNumberOfProsecutionReduction function', e);
    throw e;
  }
}

export async function getAllProsecutionSavings({
  priorityDrop,
  pctDrop,
  prosecutionDrop,
  isRowData,
}: {
  priorityDrop: any;
  pctDrop: any;
  prosecutionDrop: any;
  isRowData?: boolean;
}) {
  try {
    const rowDataProsecutionDropSaving: any = [];
    const allProsecutionSavingsMap = {};

    priorityDrop.forEach((item) => {
      const sbu = item['SBU'];
      allProsecutionSavingsMap[sbu] = (allProsecutionSavingsMap[sbu] ?? 0) + 5676.81;
      rowDataProsecutionDropSaving.push({ ...item, saving: 5676.81 });
    });

    pctDrop.forEach((item) => {
      const sbu = item['SBU'];
      allProsecutionSavingsMap[sbu] = (allProsecutionSavingsMap[sbu] ?? 0) + 16384.33;
      rowDataProsecutionDropSaving.push({ ...item, saving: 16384.33 });
    });

    prosecutionDrop.forEach((item) => {
      let rowDataSaving = 0;
      const sbu = item['SBU'];
      const country = item['Country'];
      if (country === 'US') {
        allProsecutionSavingsMap[sbu] = (allProsecutionSavingsMap[sbu] ?? 0) + 3217.71;
        rowDataSaving = 3217.71;
      } else if (epCountry.includes(country)) {
        allProsecutionSavingsMap[sbu] = (allProsecutionSavingsMap[sbu] ?? 0) + 2380.78;
        rowDataSaving = 2380.78;
      } else if (country === 'KR') {
        allProsecutionSavingsMap[sbu] = (allProsecutionSavingsMap[sbu] ?? 0) + 2518.25;
        rowDataSaving = 2518.25;
      } else if (country === 'CN') {
        allProsecutionSavingsMap[sbu] = (allProsecutionSavingsMap[sbu] ?? 0) + 3845.45;
        rowDataSaving = 3845.45;
      } else {
        allProsecutionSavingsMap[sbu] = (allProsecutionSavingsMap[sbu] ?? 0) + 2500;
        rowDataSaving = 2500;
      }

      rowDataProsecutionDropSaving.push({ ...item, saving: rowDataSaving });
    });

    if (isRowData) {
      return rowDataProsecutionDropSaving;
    }

    const allProsecutionSavingResult = Object.entries(allProsecutionSavingsMap).map(([SBU, value]) => ({
      SBU,
      value: Number((value as number).toFixed(2)),
    })) as DataItem[];

    return allProsecutionSavingResult;
  } catch (e) {
    console.log('Error in getAllProsecutionSavings function', e);
    throw e;
  }
}

export async function getTotalCostSavings({
  totalAnnuitySavings,
  allProsecutionSaving,
}: {
  totalAnnuitySavings: Record<string, number | string>;
  allProsecutionSaving: any;
}) {
  try {
    const totalCostSavings = { ...totalAnnuitySavings }; // clone to avoid mutation

    allProsecutionSaving.forEach((entry) => {
      const current = Number(totalCostSavings[entry.SBU]) || 0;
      totalCostSavings[entry.SBU] = current + entry.value;
    });

    return totalCostSavings;
  } catch (e) {
    console.log('Error in getTotalCostSavings function', e);
    throw e;
  }
}

export async function processStaticData({
  staticNewFilingsDataSourceId,
  staticEstimatesDataSourceId,
  staticProjectOpenedDataSourceId,
  currentYear,
  currentMonth,
  customReportModel,
}: {
  staticNewFilingsDataSourceId: string;
  staticEstimatesDataSourceId: string;
  staticProjectOpenedDataSourceId: string;
  currentYear: string;
  currentMonth: string;
  customReportModel: CustomReportModelAccessReturnType;
}) {
  try {
    let finalStaticData: any = [];
    const dataSourceVersionDetails = await dataSourceVersionServices.getDataSourceVersionList({
      query: {
        dataSourceId: {
          $in: [staticNewFilingsDataSourceId, staticEstimatesDataSourceId, staticProjectOpenedDataSourceId],
        },
        versionValue: {
          $in: [
            `${currentYear}-12`,
            `${Number(currentYear) - 1}-12`,
            `${Number(currentYear) - 2}-12`,
            `${Number(currentYear) - 3}-12`,
            `${Number(currentYear) - 4}-12`,
          ],
        },
        isCurrent: true,
      },
    });

    const staticNewFilingData = {};
    const staticEstimatesData = {};
    const staticProjectOpenedData = {};
    for (let i = 0; i < dataSourceVersionDetails.data.length; i++) {
      const dataSourceVersion = dataSourceVersionDetails.data[i];
      const dataSourceVersionValue = dataSourceVersion.versionValue;
      const dataSourceVersionId = dataSourceVersion._id.toString();
      const dataSourceId = dataSourceVersion.dataSourceId.toString();
      if (dataSourceId === staticNewFilingsDataSourceId) {
        const data = await customReportModel.DataSourceVersionValueStaticNewFilings.aggregate([
          {
            $match: {
              dataSourceVersionId: new ObjectId(dataSourceVersionId),
            },
          },
        ]);

        staticNewFilingData[dataSourceVersionValue] = data.reduce((acc, data) => {
          const rowData = data.rowData;
          acc[rowData.SBU] = rowData['New Filings']; // Set key-value pair in the accumulator
          return acc;
        }, {});
      } else if (dataSourceId === staticEstimatesDataSourceId) {
        const data = await customReportModel.DataSourceVersionValueStaticEstimates.aggregate([
          {
            $match: {
              dataSourceVersionId: new ObjectId(dataSourceVersionId),
            },
          },
        ]);

        staticEstimatesData[dataSourceVersionValue] = data.reduce((acc, data) => {
          const rowData = data.rowData;
          acc[rowData.SBU] = rowData['Estimates']; // Set key-value pair in the accumulator
          return acc;
        }, {});
      } else if (dataSourceId === staticProjectOpenedDataSourceId) {
        const data = await customReportModel.DataSourceVersionValueStaticProjectOpened.aggregate([
          {
            $match: {
              dataSourceVersionId: new ObjectId(dataSourceVersionId),
            },
          },
        ]);

        staticProjectOpenedData[dataSourceVersionValue] = data.reduce((acc, data) => {
          const rowData = data.rowData;
          acc[rowData.SBU] = rowData['Projects Opened']; // Set key-value pair in the accumulator
          return acc;
        }, {});
      }
    }

    const allStaticNewFilingData: any[] = [];
    //process new filing
    for (let i = 1; i <= 4; i++) {
      const versionValue = `${Number(currentYear) - i}-12`;

      if (staticNewFilingData[versionValue] && Object.keys(staticNewFilingData[versionValue]).length > 0) {
        allStaticNewFilingData.push({
          SBU: `${Number(currentYear) - i} New Apps filed`,
          ...staticNewFilingData[versionValue],
        });
      } else {
        allStaticNewFilingData.push({
          SBU: `${Number(currentYear) - i} New Apps filed`,
        });
      }
    }

    const allNewEstimates: any[] = [];

    //current year estimates
    if (staticEstimatesData[`${currentYear}-12`] && Object.keys(staticEstimatesData[`${currentYear}-12`]).length > 0) {
      allNewEstimates.push({ SBU: `${currentYear} New Apps Estimate`, ...staticEstimatesData[`${currentYear}-12`] });
    } else {
      allNewEstimates.push({ SBU: `${currentYear} New Apps Estimate` });
    }

    const allNewProject: any[] = [];
    //project opened
    for (let i = 1; i <= 4; i++) {
      const versionValue = `${Number(currentYear) - i}-12`;

      if (staticProjectOpenedData[versionValue] && Object.keys(staticProjectOpenedData[versionValue]).length > 0) {
        allNewProject.push({
          SBU: `Projects Opened in ${Number(currentYear) - i}`,
          ...staticProjectOpenedData[versionValue],
        });
      } else {
        allNewProject.push({
          SBU: `Projects Opened in ${Number(currentYear) - i}`,
        });
      }
    }
    return {
      allNewEstimates,
      allStaticNewFilingData,
      allNewProject,
    };
  } catch (e) {
    console.log('Error in processStaticData function.', e);
    throw e;
  }
}
export function getFormattedDataToProcessReportHeaders({
  sbuColumnDetails,
  data,
  defaultValue,
}: {
  sbuColumnDetails: string;
  data: Record<string, any>[];
  defaultValue?: Record<string, number>;
}) {
  try {
    const formattedData: Record<string, any> = {
      SBU: sbuColumnDetails,
    };

    // Sum values from `data`
    for (let item of data) {
      formattedData[item.SBU] = (formattedData[item.SBU] || 0) + item.value;
    }

    // Add default values (if any)
    if (defaultValue && Object.keys(defaultValue).length > 0) {
      for (const key in defaultValue) {
        formattedData[key] = (formattedData[key] || 0) + defaultValue[key];
      }
    }

    return formattedData;
  } catch (e) {
    console.log('Error in getFormattedDataToProcessReportHeaders.', e);
    throw e;
  }
}
