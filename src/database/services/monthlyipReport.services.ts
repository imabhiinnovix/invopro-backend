import mongoose from 'mongoose';
import { DateTime } from 'luxon';
import createDefaultDataSourceVersionModel from '../models/defaultDataSourceVersionModel';

const DataSourceVersionValuePortfolio = createDefaultDataSourceVersionModel('data_reportivix_portfolios');
const DataSourceVersionValueDisclosure = createDefaultDataSourceVersionModel('data_reportivix_disclosures');
const DataSourceVersionValueAnnuities = createDefaultDataSourceVersionModel('data_reportivix_annuities');
const DataSourceVersionValueCtclinsabs = createDefaultDataSourceVersionModel('data_reportivix_ctclinsabs');
const DataSourceVersionValueSabicips = createDefaultDataSourceVersionModel('data_reportivix_sabicips');

const ObjectId = mongoose.Types.ObjectId;

export interface DataItem {
  value: number | string;
  SBU: string;
  cellName?: string;
}
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
      let normalizedSTC = stc.trim().toLowerCase();
      let mappedSTC = mapping[normalizedSTC] || stc.trim();

      if (!result[mappedSTC]) {
        result[mappedSTC] = 0;
      }
      result[mappedSTC] += value;
      total += value;
    });
  });

  const finalResult = Object.entries(result).map(([STC, value]) => ({ STC, value }));
  finalResult.push({ STC: 'Total', value: total });
  return finalResult;
}

export function getTotalPortfolioPercentage({ data }: { data: DataItem[] }) {
  // Find the total value from the SBU named 'total'
  const totalItem = data.find((item) => item?.SBU?.toLowerCase() === 'total');
  const totalValue = totalItem ? Number(totalItem.value) : 0;

  return data.map((item) => ({
    ...item,
    value: totalValue > 0 ? parseFloat(((Number(item.value) / totalValue) * 100).toFixed(2)) : 0,
  }));
}
export async function getTotalPortfolio({
  totalAppsPendingData,
  totalIssuedData,
}: {
  totalAppsPendingData: DataItem[];
  totalIssuedData: DataItem[];
}) {
  const dataMap = new Map<string, number>();

  [...totalAppsPendingData, ...totalIssuedData].forEach(({ SBU, value }) => {
    const numericValue = Number(value) || 0;
    dataMap.set(SBU, (dataMap.get(SBU) || 0) + numericValue);
  });

  return Array.from(dataMap, ([SBU, value]) => ({ SBU, value }));
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
    processedData.push(
      { value: totalDistinctCount + staticTotal, SBU: 'Total', cellName: cellMappings?.Total }
      // { value: petchemTotal, SBU: 'Petchem Total', cellName: cellMappings?.Petchem }
    );
  }

  return processedData;
}

export function addCellMaping(data: DataItem[], cellMappings?: Record<string, string>): DataItem[] {
  return data.map((item) => {
    return { ...item, cellName: cellMappings?.[item.SBU] };
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
  schemaName,
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
  schemaName?: string;
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

    const newYearApplicationFiled = await DataSourceVersionValuePortfolio.aggregate([
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
      // Count the distinct Case_Reference1 by SBU
      {
        $group: {
          _id: '$SBU',
          value: { $sum: 1 },
        },
      },
      {
        $project: {
          SBU: '$_id',
          _id: 0,
          value: 1,
        },
      },
    ]);
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
}: {
  disclosureDataSourceVersionId: string;
  currentYear: string;
  isActive: boolean;
  isDrafted: boolean;
  isYearRequired: boolean;
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
    const activeDisclosure = await DataSourceVersionValueDisclosure.aggregate([
      {
        $match: matchCondition,
      },
      {
        $group: {
          _id: '$rowData.DisclosureNumber',
          SBU: { $first: '$rowData.SBU' },
        },
      },
      // Count the distinct Case_Reference1 by SBU
      {
        $group: {
          _id: '$SBU',
          value: { $sum: 1 },
        },
      },
      {
        $project: {
          SBU: '$_id',
          _id: 0,
          value: 1,
        },
      },
    ]);
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
}: {
  disclosureDataSourceVersionId: string;
  currentYear: string;
  isActive: boolean;
  isDrafted: boolean;
  isYearRequired: boolean;
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
    const activeDisclosure = await DataSourceVersionValueDisclosure.aggregate([
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
  schemaName,
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
  schemaName?: string;
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

    const newYearApplicationFiled = await DataSourceVersionValuePortfolio.aggregate([
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
  } catch (error) {
    throw error;
  }
}
const calculateCombinedPercentage = (
  newData: DataItem[],
  activeData: DataItem[],
  totalData: DataItem[]
): DataItem[] => {
  return totalData.map((total) => {
    const newEntry = newData.find((item) => item.SBU === total.SBU)?.value || 0;
    const activeEntry = activeData.find((item) => item.SBU === total.SBU)?.value || 0;

    const combined = (newEntry as number) + (activeEntry as number);
    const combinedPercentage = total.value ? ((combined / (total.value as number)) * 100).toFixed(2) : '0.00';

    return {
      SBU: total.SBU,
      value: combinedPercentage,
    };
  });
};

export async function percentageOfCurrentYearInventionDisclosureConvertedToFilings(
  portfolioDataSourceVersionId: string,
  disclosureDataSourceVersionId: string,
  currentYear: string
) {
  try {
    const newYearApplicationFiled = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
    });
    const activeDisclosureCount = await getDisclosureCount({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: false,
      isDrafted: true,
      isYearRequired: false,
    });
    const totalDisclosureCount = await getDisclosureCount({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: false,
      isDrafted: false,
      isYearRequired: true,
    });

    const processedNewYearApplicationFiled = processData({ data: newYearApplicationFiled });
    const processedActiveDisclosureCount = processData({ data: activeDisclosureCount });
    const processedTotalDisclosureCount = processData({ data: totalDisclosureCount });

    const result = calculateCombinedPercentage(
      processedNewYearApplicationFiled,
      processedActiveDisclosureCount,
      processedTotalDisclosureCount
    );
    return result;
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
}: {
  portfolioDataSourceVersionId: string;
  sabicipDataSourceVersionId: string;
  ctclinsabDataSourceVersionId: string;
  annuitiesbDataSourceVersionId: string;
  currentYear: string;
}) {
  try {
    const yearDateRange = {
      $gte: `${currentYear}-01-01T00:00:00.000Z`,
      $lte: `${currentYear}-12-31T00:00:00.000Z`,
    };

    const sabicipData = await DataSourceVersionValueSabicips.aggregate([
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

    const portfolioData = await DataSourceVersionValuePortfolio.aggregate([
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
        (portfolioItem) => portfolioItem.rowData.Case_Reference1 === sabicItem.rowData['Clients reference']
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
      const duplicate = acc.find((item) => item.Case_Reference1 === current.Case_Reference1);
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

    const ctclinsabData = await DataSourceVersionValueCtclinsabs.aggregate([
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
        (portfolioItem) => portfolioItem.rowData['Procedure Agent Ref'] === ctclinsabItem.rowData['File number']
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
      const duplicate = acc.find((item) => item.Case_Reference1 === current.Case_Reference1);
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

    const annuitiesData = await DataSourceVersionValueAnnuities.aggregate([
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
        (portfolioItem) => portfolioItem.rowData['Case_Reference1'] === annuitiesItem.rowData['Other Reference No']
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
      const duplicate = acc.find((item) => item.Case_Reference1 === current.Case_Reference1);
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
export async function getReductionsAndCostSavings({
  portfolioDataSourceVersionId,
  sabicipDataSourceVersionId,
  ctclinsabDataSourceVersionId,
  annuitiesbDataSourceVersionId,
  currentYear,
  isCurrentYearReductionCount,
}: {
  portfolioDataSourceVersionId: string;
  sabicipDataSourceVersionId: string;
  ctclinsabDataSourceVersionId: string;
  annuitiesbDataSourceVersionId: string;
  currentYear: string;
  isCurrentYearReductionCount: boolean;
}) {
  try {
    const allCasesFromPortfolio = await DataSourceVersionValuePortfolio.aggregate([
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

    // return groupedCasesBasedOnFaimlyNumber;

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
          'rowData.Case_Reference1': { $not: { $regex: 'CNRO|EP-EPT|EP-PCT|EP-ETD|EP-EPD', $options: 'i' } },

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

    const annuityDrop = await DataSourceVersionValuePortfolio.aggregate(annuityDropAggregate);

    const annuityDropCount = annuityDrop.reduce((acc, item) => {
      const sbu = item.rowData['SBU'];
      acc[sbu] = (acc[sbu] || 0) + 1;
      return acc;
    }, {});
    const annuityDropCountResult = Object.entries(annuityDropCount).map(([SBU, value]) => ({ SBU, value }));

    const annuityDropCaseReference = annuityDrop.map((data) => {
      return data.rowData.Case_Reference1;
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
          'rowData.Publication Date': { $eq: null },
          'rowData.Grant Date': { $eq: null },
          'rowData.Grant No': { $eq: null },
          'rowData.Publication No': { $eq: null },
          $or: [
            { 'rowData.Country': { $ne: 'WO' } },
            { $and: [{ 'rowData.Country': 'WO' }, { 'rowData.Case Type': { $ne: 'PRI' } }] },
          ],
          // 'rowData.Case Type': {
          //   $nin: ['PCT', 'EPP', 'ORD', 'EPT', 'NP', 'PCD', 'DIV', 'CNT', 'EAT', 'ETD', 'CIP', 'CON'],
          // },
          'rowData.IsFirstFiling': 1,
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

    const priorityDropUnfilteredWithDate = await DataSourceVersionValuePortfolio.aggregate(priorityDropAggregate);

    const groupedPriorityDropFiltered = filterCombineData(
      groupedCasesBasedOnFaimlyNumber,
      priorityDropUnfilteredWithDate
    );

    // return groupedPriorityDropFiltered.length;

    const priorityDrop = groupedPriorityDropFiltered.filter((item) => {
      const statusDate = DateTime.fromISO(item['Status Date']);
      const filingDate = DateTime.fromISO(item['Filing Date']);

      const diffInMonths = statusDate.diff(filingDate, 'months').months;

      return diffInMonths <= 24;
    });

    const priorityDropCount = priorityDrop.reduce((acc, item) => {
      const sbu = item['SBU'];
      acc[sbu] = (acc[sbu] || 0) + 1;
      return acc;
    }, {});
    const priorityDropCountResult = Object.entries(priorityDropCount).map(([SBU, value]) => ({ SBU, value }));

    // return priorityDropCountResult;

    const priorityDropCaseReference = priorityDrop.map((data) => {
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
          // 'rowData.Case Type': {
          //   $nin: ['PCT', 'EPP', 'ORD', 'EPT', 'NP', 'PCD', 'DIV', 'CNT', 'EAT', 'ETD', 'CIP', 'CON'],
          // },
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

    const pctDrop = await DataSourceVersionValuePortfolio.aggregate(pctDropAggregate);

    const groupedPctDropFiltered = filterCombineData(groupedCasesBasedOnFaimlyNumber, pctDrop);

    // return groupedPctDropFiltered;
    const pctDropCount = groupedPctDropFiltered.reduce((acc, item) => {
      const sbu = item['SBU'];
      acc[sbu] = (acc[sbu] || 0) + 1;
      return acc;
    }, {});
    const pctDropCountResult = Object.entries(pctDropCount).map(([SBU, value]) => ({ SBU, value }));

    const pctDropCaseReference = groupedPctDropFiltered.map((data) => {
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
                    { $or: [{ 'rowData.Grant Date': { $eq: null } }, { 'rowData.Grant No': { $eq: null } }] },
                    { 'rowData.IsFirstFiling': 1 },
                    { 'rowData.Publication Date': { $ne: null } },
                    { 'rowData.Publication No': { $ne: null } },
                    {
                      $or: [
                        {
                          $and: [
                            { 'rowData.Case_Reference1': { $regex: 'WO-PCT', $options: 'i' } },
                            { 'rowData.In Force': 0 },
                          ],
                        },
                        { 'rowData.Case_Reference1': { $not: { $regex: 'WO-PCT', $options: 'i' } } },
                      ],
                    },
                  ],
                },
                {
                  $and: [
                    // { $or: [{ 'rowData.Grant Date': { $eq: null } }, { 'rowData.Grant No': { $eq: null } }] },
                    { 'rowData.Case Type': { $in: ['PCT'] } },
                    { 'rowData.Country': { $ne: 'WO' } },
                  ],
                },
                {
                  $and: [
                    // { $or: [{ 'rowData.Grant Date': { $eq: null } }, { 'rowData.Grant No': { $eq: null } }] },
                    {
                      'rowData.Case Type': { $in: ['CON', 'DIV'] },
                    },
                  ],
                },
                {
                  $and: [
                    // { $or: [{ 'rowData.Grant Date': { $eq: null } }, { 'rowData.Grant No': { $eq: null } }] },
                    { 'rowData.IsFirstFiling': 0 },
                    {
                      'rowData.Case Type': 'ORD',
                    },
                    { 'rowData.Country': { $ne: 'WO' } },
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
      // {
      //   $group: {
      //     _id: '$SBU',
      //     value: { $sum: 1 },
      //   },
      // },
    ];

    const prosecutionDrop = await DataSourceVersionValuePortfolio.aggregate(prosecutionDropAggregate);

    // return prosecutionDrop;

    return {
      // annuityDrop: annuityDrop.map((d) => d.rowData),
      // annuityDropCountResult,
      // priorityDrop,
      // priorityDropCountResult,
      // pctDrop,
      // // // pctDrop: pctDrop.map((d) => d.rowData),
      // pctDropCountResult,
      // prosecutionDrop,
      prosecutionDrop: prosecutionDrop.map((d) => d.rowData),
    };
  } catch (e) {
    console.log('Error in getReductionsAndCostSavings', e);
    throw e;
  }
}
