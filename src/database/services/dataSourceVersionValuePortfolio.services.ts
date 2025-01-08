import DataSourceVersionValuePortfolio from '../models/dataSourceVersionValuePortfolio';

export const createDataSourceVersionValuePortfolio = async (createDataSourceVersionValuePortfolio: any) => {
  try {
    const dataSourceVersionValue = await DataSourceVersionValuePortfolio.insertMany(
      createDataSourceVersionValuePortfolio
    );

    return dataSourceVersionValue;
  } catch (err) {
    throw err;
  }
};
