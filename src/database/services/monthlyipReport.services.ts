import mongoose from 'mongoose';
import DataSourceVersionValuePortfolio from '../models/dataSourceVersionValuePortfolio';
const ObjectId = mongoose.Types.ObjectId;

export async function getCurrentYearNewApplicationFiled(portfolioDataSourceVersionId: string, currentYear: string) {
  try {
    const newYearApplicationFiled = await DataSourceVersionValuePortfolio.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(portfolioDataSourceVersionId),
          IsFirstFiling: 1,
          FilingDate: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`),
          },
        },
      },
      // Group by Case_Reference1 and count distinct cases
      {
        $group: {
          _id: '$Case_Reference1',
          SBU: { $first: '$SBU' },
        },
      },
      // Count the distinct Case_Reference1
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
