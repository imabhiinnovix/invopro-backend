/* eslint-disable @typescript-eslint/no-explicit-any */
import DataSourceVersion from '../../models/common/dataSourceVersion';

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

export async function getCurrentDataSourceVersion(dataSourceId: string) {
  return await DataSourceVersion.findOne({
    dataSourceId,
    isCurrent: true,
  })
    .sort({ createdAt: -1 })
    .exec();
}

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

export const getDataSourceVersionListAdvanceFunction = async ({
  query = {},
  select = '',
  page,
  limit,
  sort = { createdAt: -1 },
  populate,
  group, // Expecting an object like { _id: "$someField", count: { $sum: 1 } }
}: any) => {
  try {
    const skip = (page - 1) * limit;

    if (group) {
      // Use aggregation when group is specified
      const pipeline: any[] = [];

      if (Object.keys(query).length > 0) {
        pipeline.push({ $match: query });
      }

      pipeline.push({ $group: group });

      if (typeof skip === 'number') {
        pipeline.push({ $skip: skip });
      }

      if (typeof limit === 'number') {
        pipeline.push({ $limit: limit });
      }

      // Optional projection
      if (select) {
        const selectFields = select.split(' ').reduce((acc: any, field: string) => {
          acc[field] = 1;
          return acc;
        }, {});
        pipeline.push({ $project: selectFields });
      }

      if (sort && typeof sort === 'object') {
        const adjustedSort: any = {};
        for (const key in sort) {
          if (key in group || '$' + key === group._id) {
            adjustedSort['_id'] = sort[key]; // Sort by _id if grouped on it
          } else {
            adjustedSort[key] = sort[key];
          }
        }
        pipeline.push({ $sort: adjustedSort });
      }

      if (typeof group._id === 'string' && group._id.startsWith('$')) {
        const groupField = group._id.slice(1); // e.g., 'versionValue'
        const projection: any = {
          [groupField]: '$_id',
          _id: 0,
        };

        // Copy over computed fields like count
        Object.keys(group).forEach((key) => {
          if (key !== '_id') {
            projection[key] = 1;
          }
        });

        pipeline.push({ $project: projection });
      }
      const dataSourceVersion = await DataSourceVersion.aggregate(pipeline);

      // To get total count in case of group
      const countPipeline = [{ $match: query }, { $group: group }, { $count: 'total' }];
      const countResult = await DataSourceVersion.aggregate(countPipeline);
      const totalCount = countResult[0]?.total || 0;

      return { data: dataSourceVersion, totalCount };
    } else {
      // Use normal find when no group is provided
      let dataSourceVersionQuery: any = DataSourceVersion.find(query).select(select).skip(skip).limit(limit).sort(sort);

      if (populate && Array.isArray(populate)) {
        populate.forEach((field) => {
          dataSourceVersionQuery = dataSourceVersionQuery.populate(field);
        });
      }

      const dataSourceVersion = await dataSourceVersionQuery.exec();
      const totalCount = await DataSourceVersion.countDocuments(query);

      return { data: dataSourceVersion, totalCount };
    }
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
  selectFields = {},
  populate = [],
}: {
  match?: any;
  groupBy: string;
  page?: number;
  limit?: number;
  sort?: any;
  selectFields?: { [field: string]: 1 | 0 | string };
  populate?: {
    from: string;
    localField: string;
    foreignField: string;
    as: string;
    isSingle?: boolean;
  }[];
}) => {
  try {
    const pipeline: any[] = [];

    // 1. Match Stage
    if (match && Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }

    // 2. Group Stage
    pipeline.push({
      $group: {
        _id: `$${groupBy}`,
        doc: { $first: '$$ROOT' },
      },
    });

    // 3. Replace Root to flatten "doc"
    pipeline.push({ $replaceRoot: { newRoot: '$doc' } });

    // 4. Sort Stage
    if (sort && Object.keys(sort).length > 0) {
      pipeline.push({ $sort: sort });
    }

    // 5. Populate (lookups + unwind)
    if (populate.length) {
      populate.forEach((pop) => {
        pipeline.push({
          $lookup: {
            from: pop.from,
            localField: pop.localField,
            foreignField: pop.foreignField,
            as: pop.as,
          },
        });

        // Use $unwind only if isSingle is true to flatten the result
        if (pop.isSingle) {
          pipeline.push({
            $unwind: {
              path: `$${pop.as}`,
              preserveNullAndEmptyArrays: true, // Ensure missing fields are handled
            },
          });
        } else {
          // Unwind the dataSourceVersion if isSingle is false
          if (pop.as === 'reportRequest') {
            // No unwind needed if we just want to pull out the array
            pipeline.push({
              $addFields: {
                dataSourceVersion: {
                  $ifNull: [{ $arrayElemAt: [`$${pop.as}.dataSourceVersion`, 0] }, []],
                },
              },
            });

            // Optionally remove the original 'reportRequest' field
            pipeline.push({
              $project: {
                reportRequest: 0,
              },
            });
          }
        }
      });
    }

    // 6. Project Stage to flatten nested fields and move `dataSourceVersion` to the root level
    if (selectFields && Object.keys(selectFields).length > 0) {
      pipeline.push({ $project: selectFields });
    } else {
      pipeline.push({ $project: { _id: 0 } });
    }

    // 7. Pagination
    if (page && limit) {
      pipeline.push({ $skip: (page - 1) * limit }, { $limit: limit });
    }

    // Execute main query
    const data = await DataSourceVersion.aggregate(pipeline).exec();

    // Count total groups
    const countPipeline: any[] = [];

    if (match && Object.keys(match).length > 0) {
      countPipeline.push({ $match: match });
    }

    countPipeline.push({
      $group: { _id: `$${groupBy}` },
    });

    countPipeline.push({ $count: 'total' });

    const countResult = await DataSourceVersion.aggregate(countPipeline).exec();
    const totalCount = countResult[0]?.total || 0;

    return { data, totalCount };
  } catch (err) {
    console.error('Error in getDataSourceVersionGroupedList:', err);
    throw err;
  }
};
