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
          "rowData.Client's reference": { $exists: true },
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

function filterCombineData(data) {
  const invalidTypes = ['PCT', 'EPP', 'ORD', 'EPT', 'NP', 'PCD', 'DIV', 'CNT', 'EAT', 'ETD', 'CIP', 'CON'];
  let result: any[] = [];

  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const isInvalid = data[key].some((item) => {
        const includedItem = invalidTypes.includes(item['Case Type']);
        const match = item['Case_Reference1'].match(/\[(\d+)\]/); // Check for subcase in square brackets
        return includedItem;
      });
      if (!isInvalid) {
        result = [...result, ...data[key]];
      }
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
          'rowData.Case_Reference1': { $not: { $regex: 'CNRO', $options: 'i' } },

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
    const annuityDropCaseReference = annuityDrop.map((data) => {
      return data.rowData.Case_Reference1;
    });

    // const annuityDropCaseReference = annuityDrop
    //   .map((c) => c.rowData.Case_Reference1)
    //   .filter((ref) => {
    // const match = ref.match(/\[(\d+)\]/); // Check for subcase in square brackets
    // return match && parseInt(match[1], 10) >= 2;
    //   });

    const annuityDropCount = annuityDrop.reduce((acc, item) => {
      const sbu = item.rowData['SBU'];
      acc[sbu] = (acc[sbu] || 0) + 1;
      return acc;
    }, {});
    const annuityDropCountResult = Object.entries(annuityDropCount).map(([SBU, value]) => ({ SBU, value }));

    const priorityDropAggregate: any[] = [
      {
        $match: {
          dataSourceVersionId: new ObjectId(portfolioDataSourceVersionId),
          'rowData.Status Date': yearDateRange,
          'rowData.Status': { $in: currentStatus },
          // 'rowData.Case_Reference1': {
          //   $not: { $regex: 'RO', $options: 'i' },
          //   $nin: annuityDropCaseReference,
          // },

          // $and: [
          //   {
          //     $or: [
          //       {
          //         $and: [{ 'rowData.Publication Date': { $eq: null } }, { 'rowData.Publication No': { $eq: null } }],
          //       },
          //       {
          //         $and: [{ 'rowData.Grant Date': { $eq: null } }, { 'rowData.Grant No': { $eq: null } }],
          //       },
          //     ],
          //   },
          // ],
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
          // 'rowData.IsFirstFiling': 1,
          // 'rowData.SBU': 'SBU Agri-nutrients',
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
    // return priorityDropUnfilteredWithDate;
    console.log('priorityDropUnfilteredWithDate', priorityDropUnfilteredWithDate.length);

    const groupedPriorityDrop = {};

    for (let i = 0; i < priorityDropUnfilteredWithDate.length; i++) {
      const rowData = priorityDropUnfilteredWithDate[i].rowData;

      if (groupedPriorityDrop[rowData['CaseNumber']]) {
        groupedPriorityDrop[rowData['CaseNumber']].push(rowData);
      } else {
        groupedPriorityDrop[rowData['CaseNumber']] = [rowData];
      }
    }

    // return groupedPriorityDrop;

    // return groupedPriorityDrop;
    const groupedPriorityDropFiltered = filterCombineData(groupedPriorityDrop);

    // return groupedPriorityDropFiltered.length;

    const priorityDrop = groupedPriorityDropFiltered.filter((item) => {
      const statusDate = DateTime.fromISO(item['Status Date']);
      const filingDate = DateTime.fromISO(item['Filing Date']);
      // const caseReference = item.rowData['Case_Reference1'];
      // const match = caseReference.match(/\[(\d+)\]/);
      // return match && parseInt(match[1], 10) >= 2;
      // Calculate the difference in months
      const diffInMonths = statusDate.diff(filingDate, 'months').months;

      return (
        diffInMonths <= 24
        // !item['Publication Date'] &&
        // !item['Publication No'] &&
        // !item['Grant Date'] &&
        // !item['Grant No']
      );
    });

    // return priorityDrop;
    // const priorityDropCaseReference = priorityDrop.map((data) => {
    //   return data.rowData.Case_Reference1;
    // });
    // const priorityDropCaseReference = priorityDrop
    //   .map((c) => c.rowData.Case_Reference1)
    //   .filter((ref) => {
    //     const match = ref.match(/\[(\d+)\]/); // Check for subcase in square brackets
    //     return match && parseInt(match[1], 10) >= 2;
    //   });
    const priorityDropCount = priorityDrop.reduce((acc, item) => {
      const sbu = item['SBU'];
      acc[sbu] = (acc[sbu] || 0) + 1;
      return acc;
    }, {});
    const priorityDropCountResult = Object.entries(priorityDropCount).map(([SBU, value]) => ({ SBU, value }));

    // return priorityDropCountResult;
    const pctDropAggregate: any[] = [
      {
        $match: {
          dataSourceVersionId: new ObjectId(portfolioDataSourceVersionId),
          'rowData.Status Date': yearDateRange,
          'rowData.Status': { $in: currentStatus },
          // 'rowData.Case_Reference1': {
          //   $not: { $regex: 'RO', $options: 'i' },
          //   // $nin: [...annuityDropCaseReference, ...priorityDropCaseReference],
          // },
          $and: [{ 'rowData.Country': 'WO' }, { 'rowData.Case Type': { $ne: 'PRI' } }],
          'rowData.Case Type': {
            $nin: ['PCT', 'EPP', 'ORD', 'EPT', 'NP', 'PCD', 'DIV', 'CNT', 'EAT', 'ETD', 'CIP', 'CON'],
          },
          // 'rowData.IsFirstFiling': 1,
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

    // return pctDrop;
    // const pctDropCaseReference = pctDrop.map((data) => {
    //   return data.rowData.Case_Reference1;
    // });
    const groupedPctDrop = {};
    for (let i = 0; i < pctDrop.length; i++) {
      const rowData = pctDrop[i].rowData;

      if (groupedPctDrop[rowData['CaseNumber']]) {
        groupedPctDrop[rowData['CaseNumber']].push(rowData);
      } else {
        groupedPctDrop[rowData['CaseNumber']] = [rowData];
      }
    }

    // return groupedPriorityDrop;

    // return groupedPriorityDrop;
    const groupedPctDropFiltered = filterCombineData(groupedPctDrop);
    // return groupedPctDropFiltered;
    const pctDropCaseReference = pctDrop
      .map((c) => c.rowData.Case_Reference1)
      .filter((ref) => {
        const match = ref.match(/\[(\d+)\]/); // Check for subcase in square brackets
        return match && parseInt(match[1], 10) >= 2;
      });
    const pctDropCount = groupedPctDropFiltered.reduce((acc, item) => {
      const sbu = item['SBU'];
      acc[sbu] = (acc[sbu] || 0) + 1;
      return acc;
    }, {});
    const pctDropCountResult = Object.entries(pctDropCount).map(([SBU, value]) => ({ SBU, value }));
    // return pctDropCountResult;
    // const prosecutionDropAggregate: any[] = [
    //   {
    //     $match: {
    //       ...dropOrReductionMatch,
    //       $or: [
    //         { 'rowData.Grant Date': { $eq: null } },
    //         {
    //           'rowData.Grant No': { $eq: null },
    //         },
    //       ],

    //       $or: [
    //       { $and: [{ 'rowData.IsFirstFiling': 1 }, { 'rowData.Publication Date': { $neq: null } },$or:[$and:[{ 'rowData.Case_Reference1': { $regex: 'WO-PCT', $options: 'i' } },'rowData.In Force':1],{ $not: { $regex: 'WO-PCT', $options: 'i' } }]] },
    //         { $and: [{ 'rowData.IsFirstFiling': 0 }, { 'rowData.Case Type': 'ORD' }] },
    //       ],
    //       $or: [
    // {
    //   'rowData.Case Type': 'CON',
    // },
    //         {
    //           $and: [{ 'rowData.IsFirstFiling': 0 }, { 'rowData.Case Type': 'ORD' }],
    //         },
    //         {
    //           $and: [
    //             { 'rowData.Case_Reference1': { $regex: 'PCT', $options: 'i' } },
    //             { 'rowData.Country': { $not: 'WO' } },
    //           ],
    //         },
    //       ],
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: '$rowData.Case_Reference1',
    //       SBU: { $first: '$rowData.SBU' },
    //       dataSourceVersionId: { $first: '$dataSourceVersionId' }, // Include these fields explicitly
    //       rowData: { $first: '$rowData' },
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: '$SBU',
    //       value: { $sum: 1 },
    //     },
    //   },
    // ];

    const prosecutionDropAggregate = [
      {
        $match: {
          dataSourceVersionId: new ObjectId(portfolioDataSourceVersionId),
          'rowData.Status Date': yearDateRange,
          'rowData.Status': { $in: currentStatus },
          'rowData.Case_Reference1': {
            $not: { $regex: 'RO', $options: 'i' },
            // $nin: [...annuityDropCaseReference, ...priorityDropCaseReference, ...pctDropCaseReference],
          },

          $or: [
            // {
            //   $and: [
            //     { $or: [{ 'rowData.Grant Date': { $eq: null } }, { 'rowData.Grant No': { $eq: null } }] },
            //     { 'rowData.IsFirstFiling': 1 },
            //     { 'rowData.Publication Date': { $ne: null } },
            //     { 'rowData.Publication No': { $ne: null } },
            //     {
            //       $or: [
            //         {
            //           $and: [
            //             { 'rowData.Case_Reference1': { $regex: 'WO-PCT', $options: 'i' } },
            //             { 'rowData.In Force': 0 },
            //           ],
            //         },
            //         { 'rowData.Case_Reference1': { $not: { $regex: 'WO-PCT', $options: 'i' } } },
            //       ],
            //     },
            //   ],
            // },
            // {
            //   $and: [
            //     { $or: [{ 'rowData.Grant Date': { $eq: null } }, { 'rowData.Grant No': { $eq: null } }] },
            //     { 'rowData.Case Type': 'PCT' },
            //     { 'rowData.Country': { $ne: 'WO' } },
            //   ],
            // },
            {
              $and: [
                { $or: [{ 'rowData.Grant Date': { $eq: null } }, { 'rowData.Grant No': { $eq: null } }] },
                {
                  'rowData.Case Type': 'CON',
                },
              ],
            },
          ],

          // $and: [
          //   {
          //     $or: [
          //       { 'rowData.Country': { $ne: 'WO' } },
          //       { $and: [{ 'rowData.Country': 'WO' }, { 'rowData.Case Type': { $ne: 'PRI' } }] },
          //     ],
          //   },
          //   {
          //     $or: [
          //       {
          //         $and: [
          //           { 'rowData.IsFirstFiling': 1 },
          //           { 'rowData.Publication Date': { $ne: null } },
          //           {
          //             $or: [
          //               {
          //                 $and: [
          //                   { 'rowData.Case_Reference1': { $regex: 'WO-PCT', $options: 'i' } },
          //                   { 'rowData.In Force': 0 },
          //                 ],
          //               },
          //               { 'rowData.Case_Reference1': { $not: { $regex: 'WO-PCT', $options: 'i' } } },
          //             ],
          //           },
          //         ],
          //       },
          //       {
          //         $and: [{ 'rowData.IsFirstFiling': 0 }, { 'rowData.Case Type': 'ORD' }],
          //       },
          //     ],
          //   },
          //   {
          //     $or: [
          //       { 'rowData.Case Type': 'CON' },
          //       {
          //         $and: [{ 'rowData.IsFirstFiling': 0 }, { 'rowData.Case Type': 'ORD' }],
          //       },
          //       {
          //         $and: [
          //           { 'rowData.Case_Reference1': { $regex: 'PCT', $options: 'i' } },
          //           { 'rowData.Country': { $ne: 'WO' } },
          //         ],
          //       },
          //     ],
          //   },
          // ],
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
    return { prosecutionDrop, l: prosecutionDrop.length };
    return {
      // annuityDrop: annuityDrop.map((d) => d.rowData),
      annuityDropCountResult,
      // priorityDrop: priorityDrop.map((d) => d.rowData),
      priorityDropCountResult,
      // pctDrop: pctDrop.map((d) => d.rowData),
      pctDropCountResult,
      prosecutionDrop,
      // prosecutionDrop: prosecutionDrop.map((d) => d.rowData),
    };
  } catch (e) {
    console.log('Error in getReductionsAndCostSavings', e);
    throw e;
  }
}
