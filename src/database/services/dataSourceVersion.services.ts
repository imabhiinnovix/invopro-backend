/* eslint-disable @typescript-eslint/no-explicit-any */
import DataSourceVersion from '../models/dataSourceVersion';

export const createDataSourceVersion = async (createDataSourceVersionValue: any) => {
  try {
    const dataSourceVersion = new DataSourceVersion(createDataSourceVersionValue);
    await dataSourceVersion.save();
    return dataSourceVersion;
  } catch (err) {
    throw err;
  }
};

export const updateDataSourceVersion = async (dataSourceVersionId: string, dataSourceVersionData: any) => {
  try {
    const dataSourceVersionResp = await DataSourceVersion.findByIdAndUpdate(
      dataSourceVersionId,
      dataSourceVersionData,
      {
        new: true,
      }
    );
    return dataSourceVersionResp;
  } catch (err) {
    throw err;
  }
};

export const getDataSourceVersionBasedOnDataSourceIdAndVersionValueAndVersionName = async (
  dataSourceId: string,
  versionValue: string,
  versionName: string
) => {
  try {
    const dataSourceVersionDetails = await DataSourceVersion.findOne({
      dataSourceId,
      versionValue,
      versionName,
    });

    return dataSourceVersionDetails;
  } catch (err) {
    throw err;
  }
};

export const getDataSourceVersionList = async ({
  query,
  select = '',
  page,
  limit,
  sort = { createdAt: -1 },
  populate,
}: any) => {
  try {
    // Remove the await keyword here
    let dataSourceVersionQuery: any = DataSourceVersion.find(query)
      .select(select)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        dataSourceVersionQuery = dataSourceVersionQuery.populate(field);
      });
    }

    // Now await the final query execution
    const dataSourceVersion = await dataSourceVersionQuery.exec();

    const totalCount = await DataSourceVersion.countDocuments(query);

    return { data: dataSourceVersion, totalCount };
  } catch (err) {
    throw err;
  }
};

export const updateDataSourceVersions = async ({ query, updateFields }: any) => {
  try {
    // Perform the update operation
    const updateResult = await DataSourceVersion.updateMany(query, {
      $set: updateFields,
    });

    return updateResult;
  } catch (err) {
    throw err;
  }
};

export const getDataSourceVersion = async ({ query, populate, sort }: any) => {
  try {
    // Perform the update operation
    let dataSourceVersionQuery = DataSourceVersion.findOne(query);

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        dataSourceVersionQuery = dataSourceVersionQuery.populate(field);
      });
    }

    if (sort) {
      dataSourceVersionQuery = dataSourceVersionQuery.sort(sort);
    }

    const dataSourceVersion = await dataSourceVersionQuery.exec();

    return dataSourceVersion;
  } catch (err) {
    throw err;
  }
};

const buildFieldProjection = (fields: string[]) => {
  const projection: any = {};
  fields.forEach((field) => {
    projection[field] = `$${field}`;
  });
  return projection;
};

export const getDataSourceVersionGroupedList = async ({
  match = {},
  groupBy,
  page = 1,
  limit = 10,
  sort = { createdAt: -1 },
  selectFields = [],
}: {
  match?: any;
  groupBy: string;
  page?: number;
  limit?: number;
  sort?: any;
  selectFields?: string[];
}) => {
  try {
    const matchStage = { $match: match };

    const sortStage = { $sort: sort }; // Must sort before grouping if you want $first to work properly

    const groupStage = {
      $group: {
        _id: `$${groupBy}`,
        document: { $first: '$$ROOT' }, // grab the first full document per group
      },
    };

    const replaceRootStage = { $replaceRoot: { newRoot: '$document' } }; // flatten out _id and expose full doc

    // Optional projection
    const projectStage = selectFields.length
      ? {
          $project: selectFields.reduce(
            (acc, field) => {
              acc[field] = 1;
              return acc;
            },
            { _id: 0 } as Record<string, number>
          ),
        }
      : { $project: { _id: 0 } };

    // Build pipeline
    const pipeline: any[] = [matchStage, sortStage, groupStage, replaceRootStage];
    if (projectStage) pipeline.push(projectStage);
    if (page && limit) pipeline.push({ $skip: (page - 1) * limit }, { $limit: limit });

    const result = await DataSourceVersion.aggregate(pipeline).exec();

    // Count pipeline (no projection needed here)
    const countPipeline = [matchStage, sortStage, groupStage, { $count: 'total' }];
    const countResult = await DataSourceVersion.aggregate(countPipeline).exec();
    const totalCount = countResult[0]?.total || 0;

    return { data: result, totalCount };
  } catch (err) {
    throw err;
  }
};
