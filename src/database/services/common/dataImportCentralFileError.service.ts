/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import DataImportCentralFileErrorModel from '../../models/common/dataImportCentralFileError';

export const createManyDataImportCentralFileError = async (value: any) => {
  try {
    const resp = await DataImportCentralFileErrorModel.insertMany(value);
    return resp;
  } catch (err) {
    throw err;
  }
};

export const getCentralFileImportErrorList = async ({
  query,
  select = '',
  page,
  limit,
  sort = { updatedAt: -1 },
  populate,
}: any) => {
  try {
    let centralFileErrorQuery: any = DataImportCentralFileErrorModel.find(query)
      .select(select)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        centralFileErrorQuery = centralFileErrorQuery.populate(field);
      });
    }

    const centralFileErrors = await centralFileErrorQuery.exec();
    const totalCount = await DataImportCentralFileErrorModel.countDocuments(query);

    return { data: centralFileErrors, totalCount };
  } catch (err) {
    throw err;
  }
};

export const updateCentralFileImportErrors = async (
  query: Record<string, any>,
  updateFields: Record<string, any>
) => {
  try {
    const result = await DataImportCentralFileErrorModel.updateMany(query, { $set: updateFields });
    return result;
  } catch (err) {
    throw err;
  }
};

export const getCentralFileImportErrorRecords = async (query) => {
  try {
    const matchingDocs = await DataImportCentralFileErrorModel.find(query);
    return matchingDocs;
  } catch (error) {
    throw error;
  }
};

export const getCentralFileImportErrorRecord = async (query) => {
  try {
    const matchingDoc = await DataImportCentralFileErrorModel.findOne(query);
    return matchingDoc;
  } catch (error) {
    throw error;
  }
};

export const getCentralFileImportErrorRecordsCount = async (query) => {
  try {
    const totalCount = await DataImportCentralFileErrorModel.countDocuments(query);
    return totalCount;
  } catch (error) {
    throw error;
  }
};