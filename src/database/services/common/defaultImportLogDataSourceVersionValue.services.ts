/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAttributeByName, getEntityAttribute, getModelForEntity } from '../../../utils/entity.utils';
import createDefaultImportLogDataSourceVersionModel from '../../models/common/defaultImportLogDataSourceVersionModel';
import createDefaultDataSourceVersionModel from '../../models/common/defaultImportLogDataSourceVersionModel';
import { Model, Document, AnyBulkWriteOperation } from 'mongoose';
import { findEntityById } from './entity.services';

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

export const getDataSourceVersionValueCount = async (
  schemaName: string,
  query: Record<string, any>,
  ) => {
    try {
      const DataSourceVersionValue = createDefaultDataSourceVersionModel(schemaName);
      const totalCount = DataSourceVersionValue.countDocuments(query);

      return totalCount;
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

export const getImportLogDataSourceVersionValuesV1 = async (schemaName: string, query: Record<string, any>, entityDetails) => {
  try {
    const DataSourceVersionValueModel = createDefaultImportLogDataSourceVersionModel(schemaName);

    // Step 1: Define aggregation pipeline
    const aggregationPipeline: any[] = [{ $match: query }];

    if (!entityDetails?.attributes) return [];

    // Step 3: Build attribute maps
    const attributesMap: Record<string, any> = {};
    const refAttributesMap: Record<string, any> = {};

    for (const attr of entityDetails.attributes) {
      attributesMap[attr.name] = attr;

      // If attribute references another entity, map nested attributes
      if (attr?.referenceEntitySetting?.refEntityId) {
        const refEntityId = attr.referenceEntitySetting.refEntityId.toString();
        const refEntity: any = await findEntityById(refEntityId);
        if (refEntity?.attributes) {
          for (const refAttr of refEntity.attributes) {
            const mapKey = `${attr.name}.${refAttr.name}`;
            if (refAttr?.referenceEntitySetting?.relationType?.startsWith('mapping_')) {
              refAttributesMap[mapKey] = refAttr;
            }
          }
        }
      }
    }
    // Step 1: Lookups for all reference fields
    for (const [attrName, attr] of Object.entries(attributesMap)) {
      if (attr.referenceEntitySetting?.refEntityId) {
        const refEntityId = attr.referenceEntitySetting.refEntityId;
        const localField = `rowData.${attrName}`;
        const asField = `rowData.${attrName}_resolved`;
        const refModel = await getModelForEntity(refEntityId);

        if (!aggregationPipeline.some((stage) => stage.$lookup?.as === asField)) {
          if (attr.referenceEntitySetting?.relationType?.startsWith('mapping_')) {
             aggregationPipeline.push({
              $lookup: {
                from: refModel.collection.name,
                localField: '_id',
                foreignField: localField,
                as: asField,
              },
            });
          }else{
            aggregationPipeline.push({
              $lookup: {
                from: refModel.collection.name,
                localField,
                foreignField: '_id',
                as: asField,
              },
            });
          }
          aggregationPipeline.push({
            $unwind: { path: `$${asField}`, preserveNullAndEmptyArrays: true },
          });
        }
      }
    }

    // Step 2: Execute aggregation
    const versionValueData = await DataSourceVersionValueModel.aggregate(aggregationPipeline).exec();
    console.log('versionValueData', JSON.stringify(versionValueData));

    if (!versionValueData?.length) return [];


        // -------------------------
    // Helper: Resolve reference/mapping attributes (reuse your original logic)
    // -------------------------
    async function resolveRefAttribute(
      attr: any,
      refResolved: any,
      key: string,
      rowData: Record<string, any>,
      currentAttr?: any
    ) {
      if (!refResolved) return;

      let displayField: string | undefined;
      if (attr.referenceEntitySetting?.refEntityField) {
        const refFieldAttr = await getEntityAttribute(
          attr.referenceEntitySetting.refEntityId,
          attr.referenceEntitySetting.refEntityField
        );
        displayField = refFieldAttr?.name;
      }
      // console.log('attr',attr);
      // Original many-to-one logic
      if (
        currentAttr &&
        ['mapping_one_to_one', 'mapping_many_to_one'].includes(currentAttr?.referenceEntitySetting?.relationType)
      ) {
        const refFieldAttr = await getEntityAttribute(
          attr.referenceEntitySetting.refEntityId,
          attr.referenceEntitySetting.refEntityField
        );
        const refFieldName = refFieldAttr?.name;
        // console.log('refFieldName',refFieldName,refResolved?.rowData);
        if (refFieldName && refResolved?.rowData?.[refFieldName]) {
          const refValue = refResolved.rowData[refFieldName];
          const RefModel = await getModelForEntity(attr.referenceEntitySetting.refEntityId);
          // console.log('refFieldName',refFieldName, refValue);
          const relatedDocs: any[] = await RefModel.find({ _id: refValue }).lean();
          // console.log('relatedDocs',relatedDocs);
          if (currentAttr.referenceEntitySetting?.relationType == 'mapping_one_to_one') {
            for (const r of relatedDocs) {
              for (const subKey in r.rowData) {
                // console.log('subKey',refFieldName,key );
                // if (subKey === refFieldName) continue;
                const arrayKey = `${key}.${subKey}`;
                // console.log('arrayKey',arrayKey);
                const value = r.rowData[subKey];
                if (value !== undefined) rowData[arrayKey] = value;
              }
            }
          } else {
            for (const r of relatedDocs) {
              for (const subKey in r.rowData) {
                // console.log('subKey',refFieldName,key );
                // if (subKey === refFieldName) continue;
                const arrayKey = `${key}.${subKey}`;
                // console.log('arrayKey',arrayKey);
                if (!Array.isArray(rowData[arrayKey])) rowData[arrayKey] = [];
                const value = r.rowData[subKey];
                // console.log('value',value, subKey);
                if (Array.isArray(value)) rowData[arrayKey].push(...value);
                else if (value !== undefined) rowData[arrayKey].push(value);
                // remove duplicates
                rowData[arrayKey] = Array.from(new Set(rowData[arrayKey]));
              }
            }
          }
          // console.log('rowData',rowData);
          // Remove duplicates
          // for (const subKey in rowData) {
          //   if (subKey.startsWith(`${key}.`) && Array.isArray(rowData[subKey])) rowData[subKey] = [...new Set(rowData[subKey])];
          // }

          // // Set main field
          // rowData[`${key}.${refFieldName}`] = refResolved.rowData[refFieldName];
          // rowData[key] = displayField && refResolved.rowData[displayField] !== undefined
          //   ? refResolved.rowData[displayField]
          //   : Object.values(refResolved.rowData)[0];
        }
      }
      // Default one-to-one or array
      else if (Array.isArray(refResolved)) {
        const displayValues: string[] = [];
        for (const ref of refResolved) {
          if (!ref?.rowData) continue;
          for (const subKey in ref.rowData) {
            const arrayKey = `${key}.${subKey}`;
            if (!Array.isArray(rowData[arrayKey])) rowData[arrayKey] = [];
            const value = ref.rowData[subKey];
            if (Array.isArray(value)) rowData[arrayKey].push(...value);
            else if (value !== undefined) rowData[arrayKey].push(value);
          }
          const displayVal =
            displayField && ref.rowData[displayField] !== undefined
              ? ref.rowData[displayField]
              : Object.values(ref.rowData)[0];
          displayValues.push(displayVal);
        }
        rowData[key] = displayValues;
      } else if (refResolved && refResolved.rowData) {
        const refRowData = refResolved.rowData;
        for (const subKey in refRowData) rowData[`${key}.${subKey}`] = refRowData[subKey];
        rowData[key] =
          displayField && refRowData[displayField] !== undefined
            ? refRowData[displayField]
            : Object.values(refRowData)[0];
      }
    }
    function getTopLevelAttribute(dotKey: string): string {
      return dotKey.split('.')[0]; // take everything before first dot
    }

    // Step 6: Transform
    const transformedData = await Promise.all(
      versionValueData.map(async (doc: any) => {
        const newDoc = { ...doc };
        const rowData: Record<string, any> = { ...doc.rowData };

        for (const key in attributesMap) {
          const attr = attributesMap[key];
          // console.log('attr', attr);
          // --------- Mapping attributes logic ---------
          if (attr.referenceEntitySetting?.relationType?.startsWith('mapping_') && rowData[key] != null) {
            const isMany = attr.referenceEntitySetting.relationType === 'mapping_many_to_one';

            const RefModel = await getModelForEntity(attr.referenceEntitySetting.refEntityId);

            // Get display field name from reference setting
            const refFieldAttr = await getEntityAttribute(
              attr.referenceEntitySetting.refEntityId,
              attr.referenceEntitySetting.refEntityField
            );
            const displayField = refFieldAttr?.name;

            if (!displayField) return;

            const rowIds: any[] = [];
            const subValuesMap: Record<string, any[]> = {};
            // Find the document(s) where display field matches text
            const relatedDocs: any[] = await RefModel.find({ [`rowData.${displayField}`]: doc._id }).lean();

            for (const doc of relatedDocs) {
              if (!doc?.rowData) continue;

              rowIds.push(doc._id);

              // Collect subValues for each subKey
              for (const subKey in doc.rowData) {
                if (subKey === displayField) continue;
                // console.log('attr.referenceEntitySetting.refEntityId', attr.referenceEntitySetting.refEntityId, subKey);
                const refAttr = await getAttributeByName(attr.referenceEntitySetting.refEntityId, subKey);
                if (!refAttr?.referenceEntitySetting) continue;

                if (!subValuesMap[subKey]) subValuesMap[subKey] = [];
                subValuesMap[subKey].push(doc.rowData[subKey]);
              }
            }

            // 🔹 Now resolve subValues in batch
            for (const subKey in subValuesMap) {
              const refAttr = await getAttributeByName(attr.referenceEntitySetting.refEntityId, subKey);

              const subValues = subValuesMap[subKey];
              await resolveRefAttribute(
                { referenceEntitySetting: refAttr.referenceEntitySetting },
                { rowData: { [subKey]: isMany ? subValues : subValues[0] } },
                `${key}.${subKey}`,
                rowData,
                attr
              );
            }

            // 🔹 Assign main field with ObjectId(s)
            // rowData[key] = isMany ? rowIds : rowIds[0];

            // Assign main field to ObjectId(s)
            // rowData[key] = isMany ? rowIds : rowIds[0];
          }
          // --------- Resolved references logic ---------
          else if (rowData.hasOwnProperty(`${key}_resolved`)) {
            const refResolved = rowData[`${key}_resolved`];
            await resolveRefAttribute(attr, refResolved, key, rowData);
            delete rowData[`${key}_resolved`];
          }
        }

        for (const key in refAttributesMap) {
          const attr = refAttributesMap[key];
          // console.log('attr', attr);
          // --------- Mapping attributes logic ---------
          if (attr.referenceEntitySetting?.relationType?.startsWith('mapping_') && rowData[key] != null) {
            const isMany = attr.referenceEntitySetting.relationType === 'mapping_many_to_one';

            const RefModel = await getModelForEntity(attr.referenceEntitySetting.refEntityId);

            // Get display field name from reference setting
            const refFieldAttr = await getEntityAttribute(
              attr.referenceEntitySetting.refEntityId,
              attr.referenceEntitySetting.refEntityField
            );
            const displayField = refFieldAttr?.name;

            if (!displayField) return;

            const rowIds: any[] = [];
            const subValuesMap: Record<string, any[]> = {};
            // Find the document(s) where display field matches text
            // const relatedDocs: any[] = await RefModel.find({ [`rowData.${displayField}`]: doc._id }).lean();
            const topLevelAttribute = await getTopLevelAttribute(key);
            console.log('doc.rowData.${topLevelAttribute}_resolved._id', `doc.rowData.${topLevelAttribute}_resolved`);
            // Find the document(s) where display field matches parent _id
            const resolvedObj = doc.rowData[`${topLevelAttribute}_resolved`];
            if (!resolvedObj) continue;

            const parentId = resolvedObj._id; // this is the ObjectId you want

            const relatedDocs: any[] = await RefModel.find({ [`rowData.${displayField}`]: parentId }).lean();
            // console.log('relatedDocs', relatedDocs);
            for (const doc of relatedDocs) {
              if (!doc?.rowData) continue;

              rowIds.push(doc._id);

              // Collect subValues for each subKey
              for (const subKey in doc.rowData) {
                if (subKey === displayField) continue;
                // console.log('attr.referenceEntitySetting.refEntityId', attr.referenceEntitySetting.refEntityId, subKey);
                const refAttr = await getAttributeByName(attr.referenceEntitySetting.refEntityId, subKey);
                if (!refAttr?.referenceEntitySetting) continue;

                if (!subValuesMap[subKey]) subValuesMap[subKey] = [];
                subValuesMap[subKey].push(doc.rowData[subKey]);
              }
            }

            // 🔹 Now resolve subValues in batch
            for (const subKey in subValuesMap) {
              const refAttr = await getAttributeByName(attr.referenceEntitySetting.refEntityId, subKey);

              const subValues = subValuesMap[subKey];
              await resolveRefAttribute(
                { referenceEntitySetting: refAttr.referenceEntitySetting },
                { rowData: { [subKey]: isMany ? subValues : subValues[0] } },
                `${key}.${subKey}`,
                rowData,
                attr
              );
            }

            // 🔹 Assign main field with ObjectId(s)
            // rowData[key] = isMany ? rowIds : rowIds[0];

            // Assign main field to ObjectId(s)
            // rowData[key] = isMany ? rowIds : rowIds[0];
          }
          // --------- Resolved references logic ---------
          else if (rowData.hasOwnProperty(`${key}_resolved`)) {
            const refResolved = rowData[`${key}_resolved`];
            await resolveRefAttribute(attr, refResolved, key, rowData);
            delete rowData[`${key}_resolved`];
          }
        }

        newDoc.rowData = rowData;
        return newDoc;
      })
    );
    return transformedData;
  } catch (err) {
    console.error('Error in getImportLogDataSourceVersionValuesV1:', err);
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
