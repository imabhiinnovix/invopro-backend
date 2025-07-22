/* eslint-disable @typescript-eslint/no-explicit-any */
import createDefaultDataSourceVersionModel from '../models/defaultDataSourceVersionModel';
import { Model, Document, AnyBulkWriteOperation, Types } from 'mongoose';
import { findEntityById } from './entity.services';
import { getEntityAttribute, getModelForEntity } from '../../utils/entity.utils';

export const updateDataSourceVersionValue = async (
  schemaName: string,
  data: any[],
  attributes: any[],
  uniqueKeys: Types.ObjectId[][]
) => {
  const Model = createDefaultDataSourceVersionModel(schemaName) as Model<Document>;

  if (!Array.isArray(uniqueKeys) || uniqueKeys.length === 0) {
    return await Model.insertMany(data);
  }

  const bulkOps: AnyBulkWriteOperation<Document>[] = data.map((row) => {
  const filters: Record<string, any>[] = [];
     // Create a quick lookup map from ObjectId to attribute name
  const attributeIdToNameMap = attributes.reduce((acc, attr) => {
    acc[attr._id.toString()] = attr.name;
    return acc;
  }, {} as Record<string, string>);

    for (const rule of uniqueKeys) {
      const condition: Record<string, any> = {};

      for (const attrId of rule) {
        const attrName = attributeIdToNameMap[attrId.toString()];
        if (!attrName) continue;
        const val = row.rowData?.[attrName];
        if (val !== undefined && val !== null && `${val}`.trim() !== '') {
          condition[`rowData.${attrName}`] = val;
          break; // fallback: use first non-empty key in rule
        }
      }

      if (Object.keys(condition).length > 0) {
        filters.push(condition);
      }
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

export const createDataSourceVersionValue = async (schemaName: string, createDataSourceVersionValue: any) => {
  try {
    const DataSourceVersionValue = createDefaultDataSourceVersionModel(schemaName);

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

export const getDataSourceVersionValueV1 = async ({
  schemaName,
  query,
  select = '',
  page,
  limit,
  sort = {},
  filters = {},
  entityId = ''
}: {
  schemaName: string;
  query: any;
  select?: string;
  page: number;
  limit: number;
  sort?: Record<string, 1 | -1>;
  filters?: Record<string, any>;
  entityId:any
})  => {
  try {
    const DataSourceVersionValue = createDefaultDataSourceVersionModel(schemaName);

    const aggregationPipeline: any[] = [
      { $match: query }
    ];
  const entity:any = await findEntityById(entityId);
  const attributesMap = entity.attributes.reduce((acc, attr) => {
    acc[attr.name] = attr;
    return acc;
  }, {} as Record<string, any>);

  const filterConditions: any[] = [];

  // --- Step 1: Handle filters ---
  for (const [key, val] of Object.entries(filters)) {
    if (key.includes('.')) {
      const [refField, subField] = key.split('.');
      const attr = attributesMap[refField];

      if (attr.referenceEntitySetting?.refEntityId) {
        const refEntityId = attr.referenceEntitySetting.refEntityId;
        const localField = `rowData.${refField}`;
        const asField = `rowData.${refField}_resolved`;

        // Lookup only once
        if (!aggregationPipeline.some(p => p.$lookup?.as === asField)) {
          const refModel = await getModelForEntity(refEntityId);
          aggregationPipeline.push({
            $lookup: {
              from: refModel.collection.name,
              localField,
              foreignField: '_id',
              as: asField,
            },
          });
          aggregationPipeline.push({
            $unwind: {
              path: `$${asField}`,
              preserveNullAndEmptyArrays: true,
            },
          });
        }

        filterConditions.push({
          [`${asField}.rowData.${subField}`]: Array.isArray(val) ? { $in: val } : val,
        });
        continue;
      }
    }
     // Regular top-level attribute filter
    filterConditions.push({
      [`rowData.${key}`]: Array.isArray(val) ? { $in: val } : val,
    });
  }
  if (filterConditions.length > 0) {
    aggregationPipeline.push({
      $match: {
        $and: filterConditions,
      },
    });
  }

    // Apply sorting on rowData or other fields
    const finalSort: any = {};
    if (sort && Object.keys(sort).length > 0) {
      for (const key in sort) {
        finalSort[`rowData.${key}`] = sort[key];
      }
    } else {
      finalSort.updatedAt = -1;
    }

    aggregationPipeline.push(
      { $sort: finalSort },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    );

    // Add project if needed
    if (select) {
      const projectionFields = select.split(' ').reduce((acc: any, field: string) => {
        acc[field] = 1;
        return acc;
      }, {});
      aggregationPipeline.push({ $project: projectionFields });
    }

    // Get paginated data
    const versionValueData = await DataSourceVersionValue.aggregate(aggregationPipeline).exec();

    // Flatten _resolved fields into main fields
    const transformedData = await Promise.all(
      versionValueData.map(async (doc: any) => {
      const newDoc = { ...doc };
      const rowData: Record<string, any> = { ...doc.rowData };

      for (const key in rowData) {
        const resolvedKey = `${key}_resolved`;

        if (rowData.hasOwnProperty(resolvedKey)) {
          const refResolved = rowData[resolvedKey];
          const attr = attributesMap[key];

          if (attr.referenceEntitySetting?.refEntityField) {
            const refField = await getEntityAttribute(
              attr.referenceEntitySetting.refEntityId,
              attr.referenceEntitySetting.refEntityField
            );

            rowData[key] = {
              _id: refResolved?._id,
              name: refResolved?.rowData?.[refField.name] || null,
              ...refResolved?.rowData
            };
          } else {
            rowData[key] = refResolved?.rowData || rowData[key];
          }

          delete rowData[resolvedKey];
        }
      }

      newDoc.rowData = rowData;
      return newDoc;
    })
  );



    // Get total count via aggregation
    const countPipeline = [...aggregationPipeline];

    // Remove pagination & projection
    const stagesToRemove = ['$skip', '$limit', '$project'];
    const filteredCountPipeline = countPipeline.filter(stage => {
      const key = Object.keys(stage)[0];
      return !stagesToRemove.includes(key);
    });

    filteredCountPipeline.push({
      $count: 'totalCount',
    });

    const countResult = await DataSourceVersionValue.aggregate(filteredCountPipeline).exec();
    const totalCount = countResult?.[0]?.totalCount || 0;

    return {
      data: transformedData,
      totalCount,
    };
  
}catch (err) {
    throw err;
  }
};

