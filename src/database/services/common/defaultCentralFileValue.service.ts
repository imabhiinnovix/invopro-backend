/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { getAttributeByName, getEntityAttribute, getModelForEntity } from '../../../utils/entity.utils';
import createDefaultImportLogCentralFileModel from '../../models/common/defaultImportLogCentralFileModel';
import { Model, Document, AnyBulkWriteOperation } from 'mongoose';
import { findEntityById } from './entity.services';
import createDefaultCentralFileModel from '../../models/common/defaultCentralFileModel';

/**
 * ✅ UPSERT VALIDATED CENTRAL FILE DATA (UNIQUE LOGIC)
 */
export const updateCentralFileValue = async (
  schemaName: string,
  data: any[],
  uniqueKeys: string[][] = []
) => {
  const Model = createDefaultCentralFileModel(schemaName) as Model<Document>;

  if (!Array.isArray(uniqueKeys) || uniqueKeys.length === 0) {
    return await Model.insertMany(data);
  }

  const bulkOps: AnyBulkWriteOperation<Document>[] = data.map((row) => {
    const filters: Record<string, any>[] = [];

    for (const rule of uniqueKeys) {
      const condition: Record<string, any> = {};
      for (const key of rule) {
        condition[`rowData.${key}`] = row.rowData?.[key];
      }
      filters.push(condition);
    }

    const finalQuery = filters.length === 1 ? filters[0] : { $or: filters };

    return {
      updateOne: {
        filter: finalQuery,
        update: {
          $set: {
            ...row,
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    };
  });

  if (bulkOps.length > 0) {
    await Model.bulkWrite(bulkOps, { ordered: false });
  }

  return true;
};

/**
 * ✅ CREATE EMPTY COLLECTION (OPTIONAL)
 */
export const createEmptyCentralFileCollection = async (schemaName: string) => {
  try {
    const Model = createDefaultCentralFileModel(schemaName);
    const emptyDoc = new Model({});
    await emptyDoc.save();
  } catch (err) {
    throw err;
  }
};

/**
 * ✅ INSERT IMPORT LOG DATA (NO UPSERT)
 */
export const createCentralFileValue = async (schemaName: string, data: any[]) => {
  try {
    const Model = createDefaultCentralFileModel(schemaName);
    return await Model.insertMany(data);
  } catch (err) {
    throw err;
  }
};

/**
 * ✅ GET CENTRAL FILE IMPORT LOG DATA (PAGINATED)
 */
export const getCentralFileValue = async ({
  schemaName,
  query,
  select = '',
  page = 1,
  limit = 50,
  sort = { updatedAt: 1 },
  paginate = true
}: any) => {
  try {
    const Model = createDefaultCentralFileModel(schemaName);

    const pipeline: any[] = [
      { $match: query },
      { $sort: sort },
    ];

    // Apply pagination only if paginate = true
    if (paginate) {
      pipeline.push(
        { $skip: (page - 1) * limit },
        { $limit: limit }
      );
    }

    // Apply projection
    if (select) {
      const projectionFields = select.split(' ').reduce((acc: any, field: string) => {
        acc[field] = 1;
        return acc;
      }, {});
      pipeline.push({ $project: projectionFields });
    }

    // If paginate = false → no need for countDocuments
    if (!paginate) {
      const data = await Model.aggregate(pipeline).exec();
      return {
        data,
        totalCount: data.length
      };
    }

    // If paginate = true → return paginated data + total count
    const [data, totalCount] = await Promise.all([
      Model.aggregate(pipeline).exec(),
      Model.countDocuments(query),
    ]);

    return { data, totalCount };

  } catch (err) {
    throw err;
  }
};

/**
 * ✅ COUNT IMPORT LOG RECORDS
 */
export const getCentralFileValueCount = async (schemaName: string, query: Record<string, any>) => {
  try {
    const Model = createDefaultCentralFileModel(schemaName);
    return await Model.countDocuments(query);
  } catch (err) {
    throw err;
  }
};

/**
 * ✅ DELETE CENTRAL FILE IMPORT LOG DATA
 */
export const deleteCentralFileValue = async (schemaName: string, query: Record<string, any>) => {
  try {
    const Model: any = createDefaultCentralFileModel(schemaName);
    return await Model.deleteMany(query);
  } catch (err) {
    throw err;
  }
};

/**
 * ✅ Fetch Only rowData from Central File
 */
export const getCentralFileRowDataOnly = async ({
  schemaName,
  query,
  page = 1,
  limit = 50,
  sort = { updatedAt: 1 },
  paginate = true,
}: {
  schemaName: string;
  query: Record<string, any>;
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
  paginate?: boolean;
}) => {
  try {
    const Model = createDefaultCentralFileModel(schemaName);

    const pipeline: any[] = [
      { $match: query },
      { $sort: sort },
      { $project: { rowData: 1, _id: 0 } }, // Only rowData
    ];

    // Pagination
    if (paginate) {
      pipeline.push({ $skip: (page - 1) * limit }, { $limit: limit });
    }

    const results = await Model.aggregate(pipeline).exec();

    // Map to just rowData objects
    const data = results.map((r: any) => r.rowData);

    const totalCount = paginate ? await Model.countDocuments(query) : data.length;

    return { data, totalCount };
  } catch (err) {
    console.error('getCentralFileRowDataOnly error:', err);
    throw err;
  }
};