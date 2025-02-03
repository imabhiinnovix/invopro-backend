import mongoose from 'mongoose';
import createDefaultDataSourceVersionModel from '../models/defaultDataSourceVersionModel';

const DataSourceVersionValuePortfolio = createDefaultDataSourceVersionModel('data_reportivix_portfolios');
const DataSourceVersionValueDisclosure = createDefaultDataSourceVersionModel('data_reportivix_disclosures');

const ObjectId = mongoose.Types.ObjectId;

export interface DataItem {
  value: number | string;
  SBU: string;
  cellName?: string;
}
export function processData(data: DataItem[], cellMappings?: Record<string, string>, isCellOnly?: boolean): DataItem[] {
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
    const petchemTotal = processedData
      .filter((item) => item.SBU === 'SBU Polymers' || item.SBU === 'SBU Chemicals')
      .reduce((sum, item) => sum + (item.value as number), 0);

    // Add totals to the processed data
    processedData.push(
      { value: totalDistinctCount, SBU: 'Total', cellName: cellMappings?.Total },
      { value: petchemTotal, SBU: 'Petchem Total', cellName: cellMappings?.Petchem }
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
      matchCondition['rowData.STATUS'] = { $nin: ['UNDER OPPOSITION'] };
      if (isCurrentYearUSIssued) matchCondition['rowData.Country'] = { $in: ['US'] };
      if (isCurrentYearINTIssued) matchCondition['rowData.Country'] = { $nin: ['US'] };
      matchCondition['rowData.In Force'] = 1; // Add In Force condition for issued applications
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
              'rowData.Grant Date': { $eq: null }, // Checks if Grant Date is null
            },
            {
              $and: [
                {
                  'rowData.Status': {
                    $in: ['Under Opposition', 'UNDER OPPOSITION', 'UnderOpposition'],
                  },
                },
                {
                  'rowData.Grant Date': { $ne: null }, // Ensures Grant Date is not null
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
}: {
  disclosureDataSourceVersionId: string;
  currentYear: string;
  isActive: boolean;
  isDrafted: boolean;
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
        $in: ['Rated To Draft OC', 'Rated To Draft IH', 'RATED TO DRAFT IN HOUSE'],
      };
    }

    if (isDrafted) {
      matchCondition['rowData.DisclosureStatus'] = {
        $in: ['Rated To Draft OC', 'RATED TO DRAFT IN HOUSE', 'Rated To Draft IH'],
      };
    } else {
      matchCondition['rowData.DisclosureDate'] = yearDateRange;
    }
    const activeDisclosure = await DataSourceVersionValueDisclosure.aggregate([
      {
        $match: matchCondition,
      },

      // Group by rowData.Case_Reference1 and count distinct cases
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
      value: `${combinedPercentage}%`,
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
      isPercentagePart: true,
    });
    const activeDisclosureCount = await getDisclosureCount({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: true,
      isDrafted: false,
    });
    const totalDisclosureCount = await getDisclosureCount({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: false,
      isDrafted: false,
    });

    const processedNewYearApplicationFiled = processData(newYearApplicationFiled);
    const processedActiveDisclosureCount = processData(activeDisclosureCount);
    const processedTotalDisclosureCount = processData(totalDisclosureCount);

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
