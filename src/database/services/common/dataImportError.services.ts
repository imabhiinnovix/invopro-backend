import DataImportErrorModel from '../../models/common/dataImportError';

export const createManyDataImportError = async (value: any) => {
  try {
    const resp = await DataImportErrorModel.insertMany(value);
    return resp;
  } catch (err) {
    throw err;
  }
};

export const getDataSourceVersionErrrorList = async ({
  query,
  select = '',
  page,
  limit,
  sort = { updatedAt: -1 },
  populate,
}: any) => {
  try {
    // Remove the await keyword here
    let dataSourceVersionErrorQuery: any = DataImportErrorModel.find(query)
      .select(select)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        dataSourceVersionErrorQuery = dataSourceVersionErrorQuery.populate(field);
      });
    }

    // Now await the final query execution
    const dataSourceVersionError = await dataSourceVersionErrorQuery.exec();

    const totalCount = await DataImportErrorModel.countDocuments(query);

    return { data: dataSourceVersionError, totalCount };
  } catch (err) {
    throw err;
  }
};

export const updateDataImportErrors = async (query: Record<string, any>, updateFields: Record<string, any>) => {
  try {
    const result = await DataImportErrorModel.updateMany(query, { $set: updateFields });
    return result;
  } catch (err) {
    throw err;
  }
};

export const getDataImportErrorRecords = async (query) => {
  try {
    const matchingDocs = await DataImportErrorModel.find(query);
    return matchingDocs;
  } catch (error) {
    throw error;
  }
};
