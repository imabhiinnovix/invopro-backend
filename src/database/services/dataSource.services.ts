import DataSource from '../models/dataSource';

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
    const dataSource = await dataSourceQuery.exec();

    const totalCount = await DataSource.countDocuments(query);

    return { data: dataSource, totalCount };
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
