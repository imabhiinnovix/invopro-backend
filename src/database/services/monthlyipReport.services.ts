import mongoose from 'mongoose';
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

export function getTotalPortfolioPercentage({ data }: { data: DataItem[] }) {
  // Find the total value from the SBU named 'total'
  const totalItem = data.find((item) => item.SBU.toLowerCase() === 'total');
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
          'rowData.Current renewal date': yearDateRange, // Ensure yearDateRange is properly defined
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
        $project: {
          _id: 1, // Include the `_id` field
          dataSourceVersionId: 1,
          rowData: 1,
        },
      },
    ]);

    const mergedSabicIpPortFolioData = sabicipData.reduce((result, sabicItem) => {
      const matchingPortfolioItem = portfolioData.find(
        (portfolioItem) => portfolioItem.rowData.Case_Reference1 === sabicItem.rowData["Client's reference"]
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
          'rowData.Current renewal date': yearDateRange, // Ensure yearDateRange is properly defined
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
        (portfolioItem) => portfolioItem.rowData['ProcedureAgentRef'] === ctclinsabItem.rowData['File number']
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
          'rowData.Due Date': yearDateRange, // Ensure yearDateRange is properly defined
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
        (portfolioItem) => portfolioItem.rowData['Case_Reference1'] === annuitiesItem.rowData['Other Reference No.']
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
      value,
    }));
    return finalCurrentYearRenewalDueResult;
  } catch (e) {
    console.log('Error in getCurrentYearRenewalDue function');
    throw e;
  }
}

export async function getReductionsAndCostSavings({
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

    const currentStatus = ['Abandoned', 'Withdrawn', 'Inactive'];
    const dropOrReductionMatch = {
      dataSourceVersionId: new ObjectId(portfolioDataSourceVersionId),
      'rowData.Status Date': yearDateRange,
      $or: [{ 'rowData.Grant Date': { $ne: null } }, { 'rowData.Grant No.': { $ne: null } }],
      'rowData.Case_Reference1': {
        $not: { $regex: 'RO', $options: 'i' },
      },
    };

    const annuityDrop = await DataSourceVersionValuePortfolio.aggregate([
      {
        $match: {
          ...dropOrReductionMatch,
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
  } catch (e) {
    throw e;
  }
}
