import mongoose from 'mongoose';
import DataSourceVersionValuePortfolio from '../models/dataSourceVersionValuePortfolio';
import DataSourceVersionValueDisclosure from '../models/dataSourceVersionValueDisclosure';

const ObjectId = mongoose.Types.ObjectId;

export async function getCurrentYearNewApplicationFiled({
  portfolioDataSourceVersionId,
  currentYear,
  isPercentagePart,
  isCurrentYearUSIssued,
  isCurrentYearINTIssued,
  isUSPendingApplication,
}: {
  portfolioDataSourceVersionId: string;
  currentYear: string;
  isPercentagePart?: boolean;
  isCurrentYearUSIssued?: boolean;
  isCurrentYearINTIssued?: boolean;
  isUSPendingApplication?: boolean;
}) {
  try {
    const matchCondition = {
      dataSourceVersionId: new ObjectId(portfolioDataSourceVersionId),
    };

    if (isCurrentYearUSIssued) {
      matchCondition['rowData.InForce'] = 1;
      matchCondition['rowData.GrantDate'] = {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31`),
      };
      matchCondition['rowData.STATUS'] = {
        $nin: ['UNDER OPPOSITION'],
      };
      matchCondition['rowData.Country'] = { $in: ['US'] };
    } else if (isCurrentYearINTIssued) {
      matchCondition['rowData.InForce'] = 1;
      matchCondition['rowData.GrantDate'] = {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31`),
      };
      matchCondition['rowData.STATUS'] = {
        $nin: ['UNDER OPPOSITION'],
      };
      matchCondition['rowData.Country'] = { $nin: ['US'] };
    } else if (isUSPendingApplication) {
      matchCondition['rowData.InForce'] = 1;

      matchCondition['rowData.STATUS'] = {
        $in: ['Under Opposition', 'UNDER OPPOSITION'],
        $nin: ['UNFILED'],
      };
      matchCondition['rowData.Country'] = { $in: ['US'] };
    } else {
      matchCondition['rowData.IsFirstFiling'] = 1;
      matchCondition['rowData.FilingDate'] = {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31`),
      };
    }

    if (isPercentagePart) {
      matchCondition['rowData.InForce'] = 1;
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
          distinctCount: { $sum: 1 },
        },
      },
      {
        $project: {
          SBU: '$_id',
          _id: 0,
          distinctCount: 1,
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
      matchCondition['rowData.DisclosureDate'] = {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31`),
      };
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
          distinctCount: { $sum: 1 },
        },
      },
      {
        $project: {
          SBU: '$_id',
          _id: 0,
          distinctCount: 1,
        },
      },
    ]);
    return activeDisclosure;
  } catch (error) {
    throw error;
  }
}

interface CountData {
  distinctCount: number;
  SBU: string;
}

interface ResultData {
  SBU: string;
  combinedPercentage: string;
}
const calculateCombinedPercentage = (
  newData: CountData[],
  activeData: CountData[],
  totalData: CountData[]
): ResultData[] => {
  return totalData.map((total) => {
    const newEntry = newData.find((item) => item.SBU === total.SBU)?.distinctCount || 0;
    const activeEntry = activeData.find((item) => item.SBU === total.SBU)?.distinctCount || 0;

    const combined = newEntry + activeEntry;
    const combinedPercentage = total.distinctCount ? ((combined / total.distinctCount) * 100).toFixed(2) : '0.00';

    return {
      SBU: total.SBU,
      combinedPercentage: `${combinedPercentage}%`,
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
    const result: ResultData[] = calculateCombinedPercentage(
      newYearApplicationFiled,
      activeDisclosureCount,
      totalDisclosureCount
    );
    return {
      result,
    };
  } catch (error) {
    throw error;
  }
}
