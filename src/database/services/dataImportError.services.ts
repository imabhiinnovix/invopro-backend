import DataImportErrorModel from '../models/dataImportError';

export const createManyDataImportError = async (value: any) => {
  try {
    const resp = await DataImportErrorModel.insertMany(value);
    return resp;
  } catch (err) {
    throw err;
  }
};
