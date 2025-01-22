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
