/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import DataSource from '../../models/common/dataSource';

export const createDataSourcce = async (dataSourceData: any) => {
  try {
    const dataSource = new DataSource(dataSourceData);
    await dataSource.save();
    return dataSource;
  } catch (err) {
    throw err;
  }
};

export const updateDataSource = async (dataSourceId: string, dataSourceData: any) => {
  try {
    const dataSourceResp = await DataSource.findByIdAndUpdate(dataSourceId, dataSourceData, { new: true });
    return dataSourceResp;
  } catch (err) {
    throw err;
  }
};

export const findDataSourceByCodeAndOrganization = async (code: string, organizationId: string) => {
  try {
    const dataSourceData = await DataSource.findOne(
      { code, organizationId },
      null,
      { collation: { locale: 'en', strength: 2 } } // Case-sensitive collation
    );
    return dataSourceData;
  } catch (err) {
    throw err;
  }
};

export const findDataSourceByNameAndOrganization = async (name: string, organizationId: string) => {
  try {
    const dataSourceData = await DataSource.findOne(
      { name, organizationId },
      null,
      { collation: { locale: 'en', strength: 2 } } // Case-sensitive collation
    );
    return dataSourceData;
  } catch (err) {
    throw err;
  }
};

export const getDataSourceList = async ({
  query,
  select = '',
  page,
  limit,
  sort = { updatedAt: -1 },
  populate,
}: any) => {
  try {
    // Remove the await keyword here
    let dataSourceQuery: any = DataSource.find(query)
      .select(select)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        dataSourceQuery = dataSourceQuery.populate(field);
      });
    }

    // Now await the final query execution
    const dataSource = await dataSourceQuery.lean().exec();

    const totalCount = await DataSource.countDocuments(query);

    return { data: dataSource, totalCount };
  } catch (err) {
    throw err;
  }
};

export const getDataSourceListWithAggregation = async ({ query }: any) => {
  try {
    const data = await DataSource.aggregate([
      { $match: query },

      {
        $lookup: {
          from: 'entities',
          localField: 'entityId',
          foreignField: '_id',
          as: 'entityInfo',
        },
      },
      { $unwind: '$entityInfo' },

      {
        $project: {
          _id: 0,
          code: 1,
          name: 1,
          attributes: {
            $map: {
              input: '$entityInfo.attributes',
              as: 'attr',
              in: {
                name: '$$attr.name',
                type: '$$attr.type',
              },
            },
          },
        },
      },
    ]);

    return data;
  } catch (err) {
    throw err;
  }
};

export const getDataSource = async (query: any) => {
  try {
    const dataSource = await DataSource.findOne(query);
    return dataSource;
  } catch (err) {
    throw err;
  }
};

export const getDataSourcePopulate = async (query: any, populate: any) => {
  try {
    let dataSourceQuery: any = DataSource.findOne(query);
    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        dataSourceQuery = dataSourceQuery.populate(field);
      });
    }

    // Now await the final query execution
    const dataSource = await dataSourceQuery.lean().exec();
    return dataSource;
  } catch (err) {
    throw err;
  }
};

export const findDataSourceById = async (id: string, populate = true) => {
  try {
    return await DataSource.findById(id).populate('entityId');
  } catch (err) {
    throw err;
  }
};

export const getDataSourcesByIds = async (ids: Types.ObjectId[]) => {
  const dataSources = await DataSource.find({ _id: { $in: ids } }).lean();

  // Create a lookup map for fast access
  const dataSourceMap: Record<string, any> = {};
  for (const ds of dataSources) {
    dataSourceMap[ds._id.toString()] = ds;
  }

  return dataSourceMap;
};
