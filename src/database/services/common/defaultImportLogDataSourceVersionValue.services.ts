/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

/* eslint-disable @typescript-eslint/no-explicit-any */
import createDefaultImportLogDataSourceVersionModel from '../../models/common/defaultImportLogDataSourceVersionModel';
import createDefaultDataSourceVersionModel from '../../models/common/defaultImportLogDataSourceVersionModel';
import { Model, Document, AnyBulkWriteOperation } from 'mongoose';

export const updateDataSourceVersionValue = async (schemaName: string, data: any[], uniqueKeys: string[][]) => {
  const Model = createDefaultDataSourceVersionModel(schemaName) as Model<Document>;

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

export const createEmptyCollection = async (schemaName: string) => {
  try {
    const DefaultModel = createDefaultDataSourceVersionModel(schemaName);

    const emptyDoc = new DefaultModel({});
    await emptyDoc.save();
  } catch (err) {
    throw err;
  }
};

export const createImportLogDataSourceVersionValue = async (schemaName: string, createDataSourceVersionValue: any) => {
  try {
    const DataSourceVersionValue = createDefaultImportLogDataSourceVersionModel(schemaName);

    const dataSourceVersionValue = await DataSourceVersionValue.insertMany(createDataSourceVersionValue);

    return dataSourceVersionValue;
  } catch (err) {
    throw err;
  }
};

export const getDataSourceVersionValue = async ({
  schemaName,
  query,
  select = '',
  page,
  limit,
  sort = { updatedAt: 1 },
}: any) => {
  try {
    const DataSourceVersionValue = createDefaultDataSourceVersionModel(schemaName);

    const aggregationPipeline: any[] = [
      { $match: query },
      { $sort: sort },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];

    if (select) {
      const projectionFields = select.split(' ').reduce((acc: any, field: string) => {
        acc[field] = 1;
        return acc;
      }, {});
      aggregationPipeline.push({ $project: projectionFields });
    }

    const [versionValueData, totalCountResult] = await Promise.all([
      DataSourceVersionValue.aggregate(aggregationPipeline).exec(),
      DataSourceVersionValue.countDocuments(query),
    ]);

    return { data: versionValueData, totalCount: totalCountResult };
  } catch (err) {
    throw err;
  }
};

export const updateImportLogDataSourceVersionValue = async (
  schemaName: string,
  query: Record<string, any>,
  updateFields: Record<string, any>,
  incFields: Record<string, number> = {}
) => {
  try {
    const DataSourceVersionValueModel = createDefaultImportLogDataSourceVersionModel(schemaName);

    const result = await DataSourceVersionValueModel.updateMany(query, {
      ...(Object.keys(updateFields).length > 0 && { $set: updateFields }),
      ...(Object.keys(incFields).length > 0 && { $inc: incFields }),
    });

    return result;
  } catch (err) {
    throw err;
  }
};

export const getImportLogDataSourceVersionValues = async (schemaName: string, query: Record<string, any>) => {
  try {
    const DataSourceVersionValueModel = createDefaultImportLogDataSourceVersionModel(schemaName);

    const pipeline = [{ $match: query }, { $project: { _id: 0 } }];

    const results = await DataSourceVersionValueModel.aggregate(pipeline);

    return results;
  } catch (err) {
    throw err;
  }
};

export const deleteImportLogDataSourceVersionValues = async (schemaName: string, query: Record<string, any>) => {
  try {
    const DataSourceVersionValueModel: any = createDefaultImportLogDataSourceVersionModel(schemaName);

    const result = await DataSourceVersionValueModel.deleteMany(query);

    return result; // result.deletedCount, result.acknowledged etc.
  } catch (err) {
    throw err;
  }
};
