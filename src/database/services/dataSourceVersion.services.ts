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

// export const getDataSourceVersionBasedOnDataSourceIdAndVersionValueAndIsCurrent = async ({
//   dataSourceId,
//   versionValue,
//   isCurrent,
// }: {
//   dataSourceId: string;
//   versionValue: string;
//   isCurrent: boolean;
// }) => {
//   try {
//     const dataSourceVersionDetails = await DataSourceVersion.findOne({
//       dataSourceId,
//       versionValue,
//       isCurrent,
//     });

//     return dataSourceVersionDetails;
//   } catch (err) {
//     throw err;
//   }
// };
