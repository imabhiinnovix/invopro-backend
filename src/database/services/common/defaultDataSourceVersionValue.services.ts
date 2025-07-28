/* eslint-disable @typescript-eslint/no-explicit-any */
import createDefaultDataSourceVersionModel from '../../models/common/defaultDataSourceVersionModel';
import { Model, Document, AnyBulkWriteOperation, Types } from 'mongoose';
import { findEntityById } from './entity.services';
import { getEntityAttribute, getModelForEntity, resolveFieldPath } from '../../../utils/entity.utils'
import { getDerivedField } from './derivedField.services';

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
    const attributeIdToNameMap = attributes.reduce(
      (acc, attr) => {
        acc[attr._id.toString()] = attr.name;
        return acc;
      },
      {} as Record<string, string>
    );

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



// Your actual function
export const getDataSourceVersionValueV1 = async ({
  schemaName,
  query,
  select = '',
  page,
  limit,
  sort = {},
  filters = {},
  entityId = '',
}: {
  schemaName: string;
  query: any;
  select?: string;
  page: number;
  limit: number;
  sort?: Record<string, 1 | -1>;
  filters?: Record<string, any>;
  entityId: any;
}) => {
  try {
    const DataSourceVersionValue = createDefaultDataSourceVersionModel(schemaName);
    const entity:any = await findEntityById(entityId);
    
    // FIX: Properly typed map
    const attributesMap: Record<string, any> = entity.attributes.reduce((acc, attr) => {
      acc[attr.name] = attr;
      return acc;
    }, {} as Record<string, any>);

    const aggregationPipeline: any[] = [{ $match: query }];

    // Step 1: Lookups for all reference fields
    for (const [attrName, attr] of Object.entries(attributesMap)) {
      if (attr.referenceEntitySetting?.refEntityId) {
        const refEntityId = attr.referenceEntitySetting.refEntityId;
        const localField = `rowData.${attrName}`;
        const asField = `rowData.${attrName}_resolved`;

        const refModel = await getModelForEntity(refEntityId);

        if (!aggregationPipeline.some(stage => stage.$lookup?.as === asField)) {
          aggregationPipeline.push({
            $lookup: {
              from: refModel.collection.name,
              localField,
              foreignField: '_id',
              as: asField
            }
          });
          aggregationPipeline.push({
            $unwind: {
              path: `$${asField}`,
              preserveNullAndEmptyArrays: true
            }
          });
        }
      }
    }

    // Step 2: Handle filters
    const filterConditions: any[] = [];
    for (const [key, val] of Object.entries(filters)) {
      if (key.startsWith('Derived.')) {
        const derivedName = key.split('.')[1];
        const derivedField = await getDerivedField({
          name: derivedName,
          entityId: entityId
        });

        if (!derivedField) continue;

        const matchedRules = derivedField.valueRules.filter(vr =>
          Array.isArray(val) ? val.includes(vr.value) : vr.value === val
        );

        const derivedRuleConditions: any = [];

        for (const rule of matchedRules) {
          const conditionExpressions: any = [];

          for (const cond of rule.conditions || []) {
            const path = await resolveFieldPath(cond, entity.attributes);

            if (!path) continue;

            if (cond.operator === 'equals') {
              conditionExpressions.push({ [path]: cond.matchValues[0] });
            } else if (cond.operator === 'in') {
              conditionExpressions.push({ [path]: { $in: cond.matchValues } });
            } else if (cond.operator === 'not_in') {
              conditionExpressions.push({ [path]: { $nin: cond.matchValues } });
            } else if (cond.operator === 'exists') {
              conditionExpressions.push({ [path]: { $exists: true, $ne: null } });
            } else if (cond.operator === 'not_exists') {
              conditionExpressions.push({ [path]: { $in: [null, undefined] } });
            }
          }

          if (conditionExpressions.length > 0) {
            derivedRuleConditions.push(
              rule.conditionOperator === 'OR'
                ? { $or: conditionExpressions }
                : { $and: conditionExpressions }
            );
          }
          // console.log('conditionExpressions',conditionExpressions);
        }
        // console.log('derivedRuleConditions',derivedRuleConditions);
        if (derivedRuleConditions.length > 0) {
          filterConditions.push({ $or: derivedRuleConditions });
        }

      } else if (key.includes('.')) {
        const [refField, subField] = key.split('.');
        const asField = `rowData.${refField}_resolved`;
        filterConditions.push({
          [`${asField}.rowData.${subField}`]: Array.isArray(val) ? { $in: val } : val
        });
      } else {
        filterConditions.push({
          [`rowData.${key}`]: Array.isArray(val) ? { $in: val } : val
        });
      }
    }
    // console.log('filterConditions',filterConditions);
    if (filterConditions.length > 0) {
      aggregationPipeline.push({ $match: { $and: filterConditions } });
    }

    // Step 3: Sort
    const finalSort: Record<string, 1 | -1> = {};
    if (sort && Object.keys(sort).length > 0) {
      for (const key in sort) {
        finalSort[`rowData.${key}`] = sort[key];
      }
    } else {
      finalSort.updatedAt = -1;
    }

    aggregationPipeline.push({ $sort: finalSort }, { $skip: (page - 1) * limit }, { $limit: limit });

    // Step 4: Projection
    if (select) {
      const projectionFields = select.split(' ').reduce((acc: any, field: string) => {
        acc[field] = 1;
        return acc;
      }, {});
      aggregationPipeline.push({ $project: projectionFields });
    }

    // Step 5: Execute
    const versionValueData = await DataSourceVersionValue.aggregate(aggregationPipeline).exec();

    // Step 6: Transform
    const transformedData = await Promise.all(
      versionValueData.map(async (doc: any) => {
        const newDoc = { ...doc };
        const rowData: Record<string, any> = { ...doc.rowData };

        for (const key in attributesMap) {
          const attr = attributesMap[key];
          const resolvedKey = `${key}_resolved`;

          if (attr.referenceEntitySetting && doc.rowData?.hasOwnProperty(resolvedKey)) {
            const refResolved = doc.rowData[resolvedKey];

            if (attr.referenceEntitySetting.refEntityField) {
              const refField = await getEntityAttribute(
                attr.referenceEntitySetting.refEntityId,
                attr.referenceEntitySetting.refEntityField
              );
              rowData[key] = {
                _id: refResolved?._id,
                name: refResolved?.rowData?.[refField?.name] || null,
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

    // Step 7: Count
    const countPipeline = aggregationPipeline.filter(
      stage => !('$skip' in stage || '$limit' in stage || '$project' in stage)
    );
    countPipeline.push({ $count: 'totalCount' });

    const countResult = await DataSourceVersionValue.aggregate(countPipeline).exec();
    const totalCount = countResult?.[0]?.totalCount || 0;

    return {
      data: transformedData,
      totalCount
    };
  } catch (err) {
    throw err;
  }
};



/**
 * Find a single version value row by filter (e.g. _id, dataSourceVersionId)
 */
export const findOne = async (
  schemaName: string,
  filter: Record<string, any>
): Promise<Record<string, any> | null> => {
  const ModelClass = createDefaultDataSourceVersionModel(schemaName) as Model<Document>;
  return await ModelClass.findOne(filter).lean().exec();
};

/**
 * Update a version value row by filter (e.g. _id)
 */
export const updateOne = async (
  schemaName: string,
  filter: Record<string, any>,
  update: Record<string, any>,
  options: any = {}
) => {
  const ModelClass = createDefaultDataSourceVersionModel(schemaName) as Model<Document>;
  return await ModelClass.updateOne(filter, update, options).exec();
};

export const deleteVersionValues = async (
  schemaName: string,
  filter: Record<string, any>,
) => {
  const Model = createDefaultDataSourceVersionModel(schemaName) as Model<Document>;
  return await Model.deleteMany(filter);
};
