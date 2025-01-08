import DataSourceVersionValueDisclosure from '../models/dataSourceVersionValueDisclosure';

export const createDataSourceVersionValueDisclosure = async (createDataSourceVersionValueDisclosure: any) => {
  try {
    const dataSourceVersionValue = await DataSourceVersionValueDisclosure.insertMany(
      createDataSourceVersionValueDisclosure
    );

    return dataSourceVersionValue;
  } catch (err) {
    throw err;
  }
};

// export const getDataSourceVersionBasedOnDataSourceIdAndVersionValueAndVersionName = async (
//   dataSourceId: string,
//   versionValue: string,
//   versionName: string
// ) => {
//   try {
//     const dataSourceVersionDetails = await DataSourceVersion.findOne({
//       dataSourceId,
//       versionValue,
//       versionName,
//     });

//     return dataSourceVersionDetails;
//   } catch (err) {
//     throw err;
//   }
