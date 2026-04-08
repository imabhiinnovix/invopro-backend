/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAttributeByName, getEntityAttribute, getModelForEntity, resolveFieldPath } from '../../../utils/entity.utils';
import createDefaultImportLogDataSourceVersionModel from '../../models/common/defaultImportLogDataSourceVersionModel';
import createDefaultDataSourceVersionModel from '../../models/common/defaultImportLogDataSourceVersionModel';
import { Model, Document, AnyBulkWriteOperation } from 'mongoose';
import { findEntityById, getEntityFieldOptions } from './entity.services';
import { escapeRegExp } from '../../../utils/common.utils';
import { getDerivedField } from './derivedField.services';
import { processFieldConditions } from '../../../utils/conditionProcessor';

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
                pipeline: [{ $match: { status: 'active' } }],
              },
            });
          }else{
            aggregationPipeline.push({
              $lookup: {
                from: refModel.collection.name,
                localField,
                foreignField: '_id',
                as: asField,
                pipeline: [{ $match: { status: 'active' } }],
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
          const relatedDocs: any[] = await RefModel.find({ _id: refValue, 'status': 'active' }).lean();
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
            const relatedDocs: any[] = await RefModel.find({ [`rowData.${displayField}`]: doc._id, 'status': 'active' }).lean();

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

            const relatedDocs: any[] = await RefModel.find({ [`rowData.${displayField}`]: parentId , 'status': 'active'}).lean();
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

export const getDataSourceImportVersionValueV1 = async ({
  schemaName,
  query,
  select = '',
  page,
  limit,
  sort = {},
  filters = {},
  entityId = '',
  searchFilters = {},
  conditions
}: {
  schemaName: string;
  query: any;
  select?: string;
  page: number;
  limit: number;
  sort?: Record<string, 1 | -1>;
  filters?: Record<string, any>;
  searchFilters?: Record<string, any>;
  entityId: any;
  conditions?: any[];
}) => {
  try {
    const DataSourceVersionValue = createDefaultImportLogDataSourceVersionModel(schemaName);
    const entity: any = await findEntityById(entityId);

    // const attributesMap: Record<string, any> = entity.attributes.reduce((acc, attr) => {
    //   acc[attr.name] = attr;
    //   return acc;
    // }, {} as Record<string, any>);

    // ----------------- Cache -----------------
    const modelCache: Record<string, any> = {};
    const attrCache: Record<string, any> = {};

    const getCachedModel = async (entityId: string) => {
      if (!modelCache[entityId]) modelCache[entityId] = await getModelForEntity(entityId);
      return modelCache[entityId];
    };

    const getCachedAttr = async (entityId: string, name: string) => {
      const key = `${entityId}:${name}`;
      if (!attrCache[key]) attrCache[key] = await getAttributeByName(entityId, name);
      return attrCache[key];
    };

    const attributesMap: Record<string, any> = {};
    const refAttributesMap: Record<string, any> = {};

    // Add direct attributes
    for (const attr of entity.attributes) {
      attributesMap[attr.name] = attr;

      // If this is a mapping relation, fetch referenced attributes
      if (attr?.referenceEntitySetting?.refEntityId) {
        const refEntityId = attr.referenceEntitySetting.refEntityId.toString();
        const refEntity: any = await findEntityById(refEntityId);
        if (refEntity?.attributes) {
          for (const refAttr of refEntity.attributes) {
            // Avoid overwriting original key, prefix with mapping key
            const mapKey = `${attr.name}.${refAttr.name}`;
            if (refAttr?.referenceEntitySetting?.relationType.startsWith('mapping_')) {
              refAttributesMap[mapKey] = refAttr;
            }
          }
        }
      }
    }

    const aggregationPipeline: any[] = [];

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
                // pipeline: [{ $match: { status: 'active' } }],
              },
            });
          }else{
            aggregationPipeline.push({
              $lookup: {
                from: refModel.collection.name,
                localField,
                foreignField: '_id',
                as: asField,
                // pipeline: [{ $match: { status: 'active' } }],
              },
            });
          }
          aggregationPipeline.push({
            $unwind: { path: `$${asField}`, preserveNullAndEmptyArrays: true },
          });
        }
      }
    }

    // --------------------------------------------------
// Normalize resolved references (status: active only)
// --------------------------------------------------
const addFields: Record<string, any> = {};

for (const [attrName, attr] of Object.entries(attributesMap)) {
  if (attr.referenceEntitySetting?.refEntityId) {
    const resolvedPath = `rowData.${attrName}_resolved`;

    addFields[resolvedPath] = {
      $cond: [
        { $eq: [`$${resolvedPath}.status`, 'active'] },
        `$${resolvedPath}`,
        null,
      ],
    };
  }
}

if (Object.keys(addFields).length > 0) {
  aggregationPipeline.push({ $addFields: addFields });
}

async function buildNestedLookups({
  entityId,
  pathSegments,
  prefix = 'rowData',
  pipeline,
  visited,
  filtersForLookup = {},
  depth = 0,
  filterConditions
}: {
  entityId: string;
  pathSegments: string[];
  prefix?: string;
  pipeline: any[];
  visited: Set<string>;
  filtersForLookup?: Record<string, any>;
  depth?: number;
  filterConditions: any[]
}) {
  if (!pathSegments.length || depth > 10) return;

  const field = pathSegments[0];
  const attr = await getCachedAttr(entityId, field);
  if (!attr) return;

  const localField = `${prefix}.${field}`;
  console.log('prefix',prefix,field);

  const asField = prefix.endsWith(`${field}_resolved`)? prefix : `${prefix}.${field}_resolved`;
  const fullPath = [...pathSegments].join('.');
  // const filterString = filtersForLookup[field] ? JSON.stringify(filtersForLookup[field]) : '';
  const effectiveFilter =
  filtersForLookup?.[field] ??
  Object.values(filtersForLookup || {})[0];

  const filterString = effectiveFilter
    ? JSON.stringify(effectiveFilter)
    : '';

  const lookupKey = `${entityId}:${fullPath}:${filterString}`;
  console.log('lookupKey',lookupKey);
  if (visited.has(lookupKey)) return;
  visited.add(lookupKey);

   const alreadyHaveLookup = (fromCollection: string) =>
    pipeline.some((stage: any) => stage.$lookup?.from === fromCollection);
  console.log('attr',attr);
  // -------- mapping reference --------
  if (attr.referenceEntitySetting?.relationType?.startsWith('mapping_')) {
    const mappingEntityId = attr.referenceEntitySetting.refEntityId.toString();
    const mappingModel = await getCachedModel(mappingEntityId);

    const refFieldAttr = await getEntityAttribute(
      attr.referenceEntitySetting.refEntityId,
      attr.referenceEntitySetting.refEntityField
    );
    const displayField = refFieldAttr?.name || attr.referenceEntitySetting.refEntityField;
    if (!alreadyHaveLookup(mappingModel.collection.name)) {
      if(prefix?.endsWith('_resolved')){
        pipeline.push({
          $lookup: {
            from: mappingModel.collection.name,
            localField: `${prefix}._id`,
            foreignField: `rowData.${displayField}`,
            as: asField,
            // pipeline: [{ $match: { status: 'active' } }],
            // pipeline: [{ $project: { _id: 1, rowData: 1 } }],
          },
        });
      }else{
        pipeline.push({
          $lookup: {
            from: mappingModel.collection.name,
            localField: `_id`,
            foreignField: `rowData.${displayField}`,
            as: asField,
            // pipeline: [{ $match: { status: 'active' } }],
            // pipeline: [{ $project: { _id: 1, rowData: 1 } }],
          },
        });
      }
      pipeline.push({ $unwind: { path: `$${asField}`, preserveNullAndEmptyArrays: true } });
    }

    // ✅ Apply filters at root level
    if (pathSegments.length === 1 && filtersForLookup) {
      for (const [filterField, filterValue] of Object.entries(filtersForLookup)) {
        const matchField = `${asField}.rowData.${filterField}`;
        // ✅ Check if it's date/date-range
        const nestedAttr = await getCachedAttr(entityId, filterField);
        const dateFilter = buildDateFilter(matchField, filterValue, nestedAttr);

        if (dateFilter) {
          filterConditions.push(dateFilter);
          continue;
        }
        if (
      typeof filterValue === "object" &&
      filterValue !== null &&
      !Array.isArray(filterValue)
    ) {
      const keys = Object.keys(filterValue);
      
      if (keys.includes("$or")) {
        // ✅ Unwrap $or and rewrite with the correct matchField
        const orConditions = filterValue.$or.map((cond: any) => {
          const innerKey = Object.keys(cond)[0];
          return { [matchField]: cond[innerKey] };
        });
        filterConditions.push({ $or: orConditions });

      } else if (keys.includes("$and")) {
        // ✅ Handle $and similarly
        const andConditions = filterValue.$and.map((cond: any) => {
          const innerKey = Object.keys(cond)[0];
          return { [matchField]: cond[innerKey] };
        });
        filterConditions.push({ $and: andConditions });

      } else if (keys.length === 1 && keys[0].startsWith("$")) {
        // ✅ Single operator like { $regex: ... }
        filterConditions.push({ [matchField]: filterValue });
      } else if (
        keys.length === 1 &&
        !keys[0].startsWith("$") &&
        keys[0].includes(".")
      ) {
        // ✅ Case like { "rowData.FOEmail": { $regex: ... } }
        filterConditions.push({ [matchField]: filterValue[keys[0]] });
      } else {
        // ✅ Plain object with multiple operators
        filterConditions.push({ [matchField]: filterValue });
      }
    } else {
      // ✅ Simple equality
      filterConditions.push({ [matchField]: filterValue });
    }
      }
    }

    if (pathSegments.length > 1) {
      await buildNestedLookups({
        entityId: mappingEntityId,
        pathSegments: pathSegments.slice(1),
        prefix: `${asField}`,
        pipeline,
        visited,
        filtersForLookup,
        depth: depth + 1,
        filterConditions
      });
    }
    return;
  }

  // -------- normal reference --------
  if (attr.referenceEntitySetting?.refEntityId) {
    const refEntityId = attr.referenceEntitySetting.refEntityId.toString();
    const refModel = await getCachedModel(refEntityId);
    const isLast = pathSegments.length === 1;

    if (!alreadyHaveLookup(refModel.collection.name)) {
      pipeline.push({
        $lookup: {
          from: refModel.collection.name,
          localField: `${prefix}.rowData.${field}`,
          foreignField: '_id',
          as: asField,
          // pipeline: [{ $match: { status: 'active' } }],
        },
      });
        pipeline.push({ $unwind: { path: `$${asField}`, preserveNullAndEmptyArrays: true } });
    }

    // ✅ Apply filters at root level
 if (isLast && filtersForLookup) {
  for (const [filterField, filterValue] of Object.entries(filtersForLookup)) {
    const matchField = `${asField}.rowData.${filterField}`;
    // ✅ Check if it's date/date-range
    const nestedAttr = await getCachedAttr(entityId, filterField);
    const dateFilter = buildDateFilter(matchField, filterValue, nestedAttr);

    if (dateFilter) {
      filterConditions.push(dateFilter);
      continue;
    }
    if (
      typeof filterValue === "object" &&
      filterValue !== null &&
      !Array.isArray(filterValue)
    ) {
      const keys = Object.keys(filterValue);
      
      if (keys.includes("$or")) {
        // ✅ Unwrap $or and rewrite with the correct matchField
        const orConditions = filterValue.$or.map((cond: any) => {
          const innerKey = Object.keys(cond)[0];
          return { [matchField]: cond[innerKey] };
        });
        filterConditions.push({ $or: orConditions });

      } else if (keys.includes("$and")) {
        // ✅ Handle $and similarly
        const andConditions = filterValue.$and.map((cond: any) => {
          const innerKey = Object.keys(cond)[0];
          return { [matchField]: cond[innerKey] };
        });
        filterConditions.push({ $and: andConditions });

      } else if (keys.length === 1 && keys[0].startsWith("$")) {
        // ✅ Single operator like { $regex: ... }
        filterConditions.push({ [matchField]: filterValue });
      } else if (
        keys.length === 1 &&
        !keys[0].startsWith("$") &&
        keys[0].includes(".")
      ) {
        // ✅ Case like { "rowData.FOEmail": { $regex: ... } }
        filterConditions.push({ [matchField]: filterValue[keys[0]] });
      } else {
        // ✅ Plain object with multiple operators
        filterConditions.push({ [matchField]: filterValue });
      }
    } else {
      // ✅ Simple equality
      filterConditions.push({ [matchField]: filterValue });
    }
  }
}



    if (!isLast) {
      await buildNestedLookups({
        entityId: refEntityId,
        pathSegments: pathSegments.slice(1),
        prefix: `${asField}`,
        pipeline,
        visited,
        filtersForLookup,
        depth: depth + 1,
        filterConditions
      });
    }
  }
}
async function buildNestedLookupsForSearch({
  entityId,
  pathSegments,
  prefix = 'rowData',
  aggregationPipeline,
  visited,
  filtersForLookup = {},
  depth = 0,
  searchConditions,
}: {
  entityId: string;
  pathSegments: string[];
  prefix?: string;
  aggregationPipeline: any[];
  visited: Set<string>;
  filtersForLookup?: Record<string, any>;
  depth?: number;
  searchConditions: any[];
}) {
  if (!pathSegments.length || depth > 10) return;

  const field = pathSegments[0];
  const attr = await getCachedAttr(entityId, field);
  if (!attr) return;

  const localField = `${prefix}.${field}`;
  const asField = `${prefix}.${field}_resolved`;
  const fullPath = [...pathSegments].join('.');
  const filterString = filtersForLookup[field] ? JSON.stringify(filtersForLookup[field]) : '';
  const lookupKey = `${entityId}:${fullPath}:${filterString}`;

  // if (visited.has(lookupKey)) return;
  // visited.add(lookupKey);

  const alreadyHaveLookup = (fromCollection: string) =>
    aggregationPipeline.some((stage: any) => stage.$lookup?.from === fromCollection);

  // -------- mapping reference --------
  if (attr.referenceEntitySetting?.relationType?.startsWith('mapping_')) {
    const mappingEntityId = attr.referenceEntitySetting.refEntityId.toString();
    const mappingModel = await getCachedModel(mappingEntityId);

    const refFieldAttr = await getEntityAttribute(
      attr.referenceEntitySetting.refEntityId,
      attr.referenceEntitySetting.refEntityField
    );
    const displayField = refFieldAttr?.name || attr.referenceEntitySetting.refEntityField;

    if (!alreadyHaveLookup(mappingModel.collection.name)) {
      aggregationPipeline.push({
        $lookup: {
          from: mappingModel.collection.name,
          localField: `${prefix}._id`,
          foreignField: `rowData.${displayField}`,
          as: asField,
          // pipeline: [{ $match: { status: 'active' } }],
          // pipeline: [{ $project: { _id: 1, rowData: 1 } }],
        },
      });
      aggregationPipeline.push({ $unwind: { path: `$${asField}`, preserveNullAndEmptyArrays: true } });
    }

    // ✅ Apply filters at root level
    if (pathSegments.length === 1 && filtersForLookup) {
      for (const [filterField, filterValue] of Object.entries(filtersForLookup)) {
        const matchField = `${asField}.rowData.${filterField}`;
        searchConditions.push({ [matchField]: filterValue });
      }
    }

    if (pathSegments.length > 1) {
      await buildNestedLookupsForSearch({
        entityId: mappingEntityId,
        pathSegments: pathSegments.slice(1),
        prefix: `${asField}`,
        aggregationPipeline,
        visited,
        filtersForLookup,
        depth: depth + 1,
        searchConditions
      });
    }
    return;
  }

  // -------- normal reference --------
  if (attr.referenceEntitySetting?.refEntityId) {
    const refEntityId = attr.referenceEntitySetting.refEntityId.toString();
    const refModel = await getCachedModel(refEntityId);
    const isLast = pathSegments.length === 1;

    if (!alreadyHaveLookup(refModel.collection.name)) {
      aggregationPipeline.push({
        $lookup: {
          from: refModel.collection.name,
          localField: `${prefix}.rowData.${field}`,
          foreignField: '_id',
          as: asField,
          // pipeline: [{ $match: { status: 'active' } }],
        },
      });
        aggregationPipeline.push({ $unwind: { path: `$${asField}`, preserveNullAndEmptyArrays: true } });
    }

    // ✅ Apply filters at root level
  if (isLast && filtersForLookup) {
  const matchConditions: Record<string, any> = {};

  for (const [filterField, filterValue] of Object.entries(filtersForLookup)) {
    const matchField = `${asField}.rowData.${filterField}`;

    if (
      typeof filterValue === "object" &&
      filterValue !== null &&
      !Array.isArray(filterValue)
    ) {
      const keys = Object.keys(filterValue);

      if (keys.length === 1 && keys[0].startsWith("$")) {
        // ✅ Direct Mongo operator
        matchConditions[matchField] = filterValue;
      } else if (
        keys.length === 1 &&
        !keys[0].startsWith("$") &&
        keys[0].includes(".")
      ) {
        // ✅ Case like { "rowData.FOEmail": { $regex: ... } }
        matchConditions[matchField] = filterValue[keys[0]];
      } else {
        // ✅ Plain object (multiple operators)
        matchConditions[matchField] = filterValue;
      }
    } else {
      // ✅ Simple equality
      matchConditions[matchField] = filterValue;
    }
  }

  if (Object.keys(matchConditions).length > 0) {
    searchConditions.push(matchConditions);
  }
}



    if (!isLast) {
      await buildNestedLookupsForSearch({
        entityId: refEntityId,
        pathSegments: pathSegments.slice(1),
        prefix: `${asField}`,
        aggregationPipeline,
        visited,
        filtersForLookup,
        depth: depth + 1,
        searchConditions
      });
    }
  }
}




// Helper to build filter value (regex for strings)
  const buildFilterForValue = (v: any) =>
    typeof v === "string"
      ? { $regex: `^${escapeRegExp(v.trim())}$`, $options: "i" }
      : v;

  const buildFilterForValueForSearch = (v: any) =>
  typeof v === "string"
    ? { $regex: `^${escapeRegExp(v.trim())}`, $options: "i" } // removed $
    : v;
    








const safeDate = (value: any) => {
  const d = new Date(value);
  return !isNaN(d.getTime()) ? d : value;
};





    // Step 2: Filters (unchanged)

    function buildDateFilter(key: string, val: any, attr: any) {

  // date-range filter
  if (attr?.type === "date-range" && val?.startDate && val?.endDate) {
    const start = safeDate(val.startDate);
    const end = safeDate(val.endDate);
    if (!start || !end) return null;   // avoid empty-string crash

    return {
      [key]: { $gte: start, $lte: end }
    };
  }

  // single date
  if (attr?.type === "date" && typeof val === "string") {
    const d = safeDate(val);
    if (!d) return null;               // avoid empty-string crash

    return {
      [key]: { $eq: d }
    };
  }

  return null;
}


    const filterConditions: any[] = [];
    const visited = new Set<string>();
    for (const [key, val] of Object.entries(filters)) {
        // ✅ Date / Date-Range
        const attr = attributesMap[key] || refAttributesMap[key];
        const dateFilter = buildDateFilter(`rowData.${key}`, val, attr);
        if (dateFilter) {
          filterConditions.push(dateFilter);
          continue;
        }

      if (key.startsWith('Derived.')) {
        const derivedName = key.split('.')[1];
        const derivedField = await getDerivedField({ name: derivedName, entityId });
        if (!derivedField) continue;

        const matchedRules = derivedField.valueRules.filter((vr) =>
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
} 
else if (cond.operator === 'in') {
  conditionExpressions.push({ [path]: { $in: cond.matchValues } });
} 
else if (cond.operator === 'not_in') {
  conditionExpressions.push({ [path]: { $nin: cond.matchValues } });
} 
else if (cond.operator === 'exists') {
  conditionExpressions.push({ [path]: { $exists: true, $ne: null } });
} 
else if (cond.operator === 'not_exists') {
  conditionExpressions.push({ [path]: { $in: [null, undefined] } });
} 
else if (cond.operator === 'match_case_insensitive_array') {
  const regexArray = (cond.matchValues || []).map((val: string) => ({
    [path]: { $regex: `^${val}$`, $options: 'i' },
  }));

  if (regexArray.length > 0) {
    conditionExpressions.push({ $or: regexArray });
  }
} 
else if (cond.operator === 'not_match_case_insensitive_array') {
  const regexArray = (cond.matchValues || []).map((val: string) => ({
    [path]: { $regex: `^${val}$`, $options: 'i' },
  }));

  if (regexArray.length > 0) {
    conditionExpressions.push({ $nor: regexArray });
  }
}

          }
          if (conditionExpressions.length > 0) {
            derivedRuleConditions.push(
              rule.conditionOperator === 'OR' ? { $or: conditionExpressions } : { $and: conditionExpressions }
            );
          }
        }

        if (derivedRuleConditions.length > 0) filterConditions.push({ $or: derivedRuleConditions });
     } else if (key.includes(".")) {
  const pathSegments = key.split(".");
  const lastField = pathSegments[pathSegments.length - 1];

  // Full filter path inside the nested document
  const filterCondition = Array.isArray(val)
    ? {
        $or: val.map((v) => ({
          [`rowData.${lastField}`]: buildFilterForValue(v),
        })),
      }
    : { [`rowData.${lastField}`]: buildFilterForValue(val) };

  // Pass filter into buildNestedLookups for correct nested $lookup pipeline
  await buildNestedLookups({
    entityId,
    pathSegments: pathSegments.slice(0, -1), // all except last
    pipeline: aggregationPipeline,
    visited,
    filtersForLookup: { [lastField]: filterCondition },
    filterConditions
  });
}

      // Top-level attribute (primitive or reference)
       else {
    const attr = attributesMap[key];
    if (attr?.referenceEntitySetting?.refEntityId && !attr.referenceEntitySetting?.relationType?.startsWith('mapping_')) {
      const refEntityId = attr.referenceEntitySetting.refEntityId.toString();
      const refModel = await getModelForEntity(refEntityId);

      const localField = `rowData.${key}`;
      const asField = `rowData.${key}_resolved`;

      // Add lookup if not already present
      if (!aggregationPipeline.some((stage) => stage.$lookup?.as === asField)) {
        aggregationPipeline.push({
          $lookup: {
            from: refModel.collection.name,
            localField,
            foreignField: "_id",
            as: asField,
            // pipeline: [{ $match: { status: 'active' } }],
          },
        });
        aggregationPipeline.push({ $unwind: { path: `$${asField}`, preserveNullAndEmptyArrays: true } });
      }

      // ✅ Resolve actual attribute name from reference entity
      const refFieldAttr = await getEntityAttribute(
        attr.referenceEntitySetting.refEntityId,
        attr.referenceEntitySetting.refEntityField
      );
      const displayField = refFieldAttr?.name || attr.referenceEntitySetting.refEntityField;

      const filterCondition = Array.isArray(val)
      ? {
          $or: val.map((v) => ({
            [`${asField}.rowData.${displayField}`]: buildFilterForValue(v),
          })),
        }
      : { [`${asField}.rowData.${displayField}`]: buildFilterForValue(val) };

      filterConditions.push(filterCondition);
    } else {
      const filterCondition = Array.isArray(val)
      ? {
          $or: val.map((v) => ({
            [`rowData.${key}`]: buildFilterForValue(v),
          })),
        }
      : { [`rowData.${key}`]: buildFilterForValue(val) };

      filterConditions.push(filterCondition);
    }
      }
    }
    console.log('filterConditions', JSON.stringify(filterConditions));
    // if (filterConditions.length > 0) aggregationPipeline.push({ $match: { $and: filterConditions } });
    // Step 3: Search Filters (add this after filter conditions)
    const searchConditions: any[] = [];
    console.log('searchFilters',searchFilters);
    if (Object.keys(searchFilters).length > 0) {
      for (const [key, searchValue] of Object.entries(searchFilters)) {
        if (!searchValue || (typeof searchValue === 'string' && searchValue.trim().length === 0)) continue;

        const searchRegex = { $regex: searchValue, $options: 'i' }; // Case-insensitive regex

        if (key.startsWith('Derived.')) {
          const derivedName = key.split('.')[1];
          const derivedField = await getDerivedField({ name: derivedName, entityId });
          if (!derivedField) continue;

          // For derived fields, we need to check against the actual field paths
          // that would generate the derived values
          const derivedSearchConditions: any[] = [];

          for (const rule of derivedField.valueRules) {
            const ruleConditions: any[] = [];
            for (const cond of rule.conditions || []) {
              const path = await resolveFieldPath(cond, entity.attributes);
              if (!path) continue;

              // Add regex search condition for this path
              ruleConditions.push({ [path]: searchRegex });
            }

            if (ruleConditions.length > 0) {
              derivedSearchConditions.push(
                rule.conditionOperator === 'OR' ? { $or: ruleConditions } : { $and: ruleConditions }
              );
            }
          }

          if (derivedSearchConditions.length > 0) {
            searchConditions.push({ $or: derivedSearchConditions });
          }
        } else if (key.includes('.')) {
          // Handle reference field search (e.g., "refField.subField")
          // const [refField, subField] = key.split('.');
          // const asField = `rowData.${refField}_resolved`;
          // searchConditions.push({ [`${asField}.rowData.${subField}`]: searchRegex });

          const pathSegments = key.split(".");
          const lastField = pathSegments[pathSegments.length - 1];
          
          // Full filter path inside the nested document
          const searchCondition = Array.isArray(searchValue)
            ? {
                $or: searchValue.map((v) => ({
                  [`rowData.${lastField}`]: buildFilterForValueForSearch(v),
                })),
              }
            : { [`rowData.${lastField}`]: buildFilterForValueForSearch(searchValue) };

          // Pass filter into buildNestedLookups for correct nested $lookup pipeline
          await buildNestedLookupsForSearch({
            entityId,
            pathSegments: pathSegments.slice(0, -1), // all except last
            aggregationPipeline,
            visited,
            filtersForLookup: { [lastField]: searchCondition },
            searchConditions,
          });
        } else {
          // Handle regular field search
          // searchConditions.push({ [`rowData.${key}`]: searchRegex });
          const attr = attributesMap[key];
    if (attr?.referenceEntitySetting?.refEntityId && !attr.referenceEntitySetting?.relationType?.startsWith('mapping_')) {
      const refEntityId = attr.referenceEntitySetting.refEntityId.toString();
      const refModel = await getModelForEntity(refEntityId);

      const localField = `rowData.${key}`;
      const asField = `rowData.${key}_resolved`;

      // Add lookup if not already present
      if (!aggregationPipeline.some((stage) => stage.$lookup?.as === asField)) {
        aggregationPipeline.push({
          $lookup: {
            from: refModel.collection.name,
            localField,
            foreignField: "_id",
            as: asField,
            // pipeline: [{ $match: { status: 'active' } }],
          },
        });
        aggregationPipeline.push({ $unwind: { path: `$${asField}`, preserveNullAndEmptyArrays: true } });
      }

      // ✅ Resolve actual attribute name from reference entity
      const refFieldAttr = await getEntityAttribute(
        attr.referenceEntitySetting.refEntityId,
        attr.referenceEntitySetting.refEntityField
      );
      const displayField = refFieldAttr?.name || attr.referenceEntitySetting.refEntityField;


      const searchCondition = Array.isArray(searchValue)
      ? {
          $or: searchValue.map((v) => ({
            [`${asField}.rowData.${displayField}`]: buildFilterForValueForSearch(v),
          })),
        }
      : { [`${asField}.rowData.${displayField}`]: buildFilterForValueForSearch(searchValue) };

      searchConditions.push(searchCondition);
    } else {
      const searchCondition = Array.isArray(searchValue)
      ? {
          $or: searchValue.map((v) => ({
            [`rowData.${key}`]: buildFilterForValueForSearch(v),
          })),
        }
      : { [`rowData.${key}`]: buildFilterForValueForSearch(searchValue) };

      searchConditions.push(searchCondition);
    }

        }
      }
    }

    // Add search conditions to pipeline if any exist
    // if (searchConditions.length > 0 && filterConditions.length > 0) {
    //   // Use $or to match any of the search conditions (if any field matches, return the document)
    //   aggregationPipeline.push({ $match: { $or: searchConditions, $and: filterConditions } });
    // }else if (searchConditions.length > 0){
    //   aggregationPipeline.push({ $match: { $or: searchConditions } });
    // }else if(filterConditions.length > 0){
    //   aggregationPipeline.push({ $match: { $and: filterConditions } });
    // }
async function buildAggregationPathAndReturnExpr({
  entityId,
  pathSegments,
  prefix = 'rowData',
  pipeline,
  visited,
}: {
  entityId: string;
  pathSegments: string[];
  prefix?: string;
  pipeline: any[];
  visited: Set<string>;
}): Promise<string> {
  if (!pathSegments.length) return prefix; // If empty, return prefix

  const field = pathSegments[0];
  const attr = await getCachedAttr(entityId, field);
  if (!attr) return `${prefix}.${field}`; // Default path

  const asField = prefix.endsWith(`${field}_resolved`)? prefix : `${prefix}.${field}_resolved`;
  const lookupKey = `${entityId}:${pathSegments.join('.')}`;

  if (!visited.has(lookupKey)) {
    visited.add(lookupKey);

    const alreadyHaveLookup = (fromCollection: string) =>
      pipeline.some((stage: any) => stage.$lookup?.from === fromCollection);

    // -------- mapping reference --------
    if (attr.referenceEntitySetting?.relationType?.startsWith('mapping_')) {
      const mappingEntityId = attr.referenceEntitySetting.refEntityId.toString();
      const mappingModel = await getCachedModel(mappingEntityId);

      const refFieldAttr = await getEntityAttribute(
        mappingEntityId,
        attr.referenceEntitySetting.refEntityField
      );
      const displayField = refFieldAttr?.name || attr.referenceEntitySetting.refEntityField;

      if (!alreadyHaveLookup(mappingModel.collection.name)) {
        pipeline.push({
          $lookup: {
            from: mappingModel.collection.name,
            localField: prefix?.endsWith('_resolved') ? `${prefix}._id` : '_id',
            foreignField: `rowData.${displayField}`,
            as: asField,
            // pipeline: [{ $match: { status: 'active' } }],
          },
        });
        pipeline.push({ $unwind: { path: `$${asField}`, preserveNullAndEmptyArrays: true } });
      }

      if (pathSegments.length > 1) {
        return buildAggregationPathAndReturnExpr({
          entityId: mappingEntityId,
          pathSegments: pathSegments.slice(1),
          prefix: asField,
          pipeline,
          visited,
        });
      }
      return `${asField}.rowData.${displayField}`;
    }

    // -------- normal reference --------
    if (attr.referenceEntitySetting?.refEntityId) {
      const refEntityId = attr.referenceEntitySetting.refEntityId.toString();
      const refModel = await getCachedModel(refEntityId);

      if (!alreadyHaveLookup(refModel.collection.name)) {
        pipeline.push({
          $lookup: {
            from: refModel.collection.name,
            localField: `${prefix}.rowData.${field}`,
            foreignField: '_id',
            as: asField,
            // pipeline: [{ $match: { status: 'active' } }],
          },
        });
        pipeline.push({ $unwind: { path: `$${asField}`, preserveNullAndEmptyArrays: true } });
      }

      if (pathSegments.length > 1) {
        return buildAggregationPathAndReturnExpr({
          entityId: refEntityId,
          pathSegments: pathSegments.slice(1),
          prefix: asField,
          pipeline,
          visited,
        });
      }

      // Last segment: return path to value
      const refFieldAttr = await getEntityAttribute(refEntityId, attr.referenceEntitySetting.refEntityField);
      const displayField = refFieldAttr?.name || attr.referenceEntitySetting.refEntityField;
      return `${asField}.rowData.${displayField}`;
    }
  }

  // If no reference, return simple path
  return `${prefix}.rowData.${field}`;
}
const getReferenceField = async (fieldName: string) => {
    if(fieldName.includes('.')){
      const visited = new Set<string>();
      const pathSegments = fieldName.split('.');

      const refField = await buildAggregationPathAndReturnExpr({
        entityId,
        pathSegments,
        pipeline: aggregationPipeline,
        visited,
      });
      return refField;
    }else{
        const attr = attributesMap[fieldName];
      if (attr?.referenceEntitySetting?.refEntityId) {
        const refEntityId = attr.referenceEntitySetting.refEntityId.toString();
        const asField = `rowData.${fieldName}_resolved`;

        // ✅ Resolve actual attribute name from reference entity
        const refFieldAttr = await getEntityAttribute(
          attr.referenceEntitySetting.refEntityId,
          attr.referenceEntitySetting.refEntityField
        );
        const displayField = refFieldAttr?.name || attr.referenceEntitySetting.refEntityField;
        return `${asField}.rowData.${displayField}`;
      }else{
        return `rowData.${fieldName}`;
      }
    }
  };
  
    const conditionsByField: Record<string, any[]> = {};
console.log("payload conditions", JSON.stringify(conditions));

for (const condition of conditions || []) {
  const originalField = condition.field;
  let resolvedFieldPath = await getReferenceField(originalField);
    resolvedFieldPath =  resolvedFieldPath.replace(/^rowData\./, '');
 
  // Overwrite field name with resolved path
   const processedCondition = {
    field: resolvedFieldPath,
    operator: condition?.operator,
    value: condition?.value,
    _id: condition._id?.toString(),
  };
  console.log("processedCondition", JSON.stringify(processedCondition));

  if (!conditionsByField[resolvedFieldPath]) {
    conditionsByField[resolvedFieldPath] = [];
  }

  conditionsByField[resolvedFieldPath].push(processedCondition);
}

console.log("conditionsByField", JSON.stringify(conditionsByField));

    const entityFieldOptions = await getEntityFieldOptions(entityId);

    const getFieldType = (fieldName: string) => {
      const attribute = entityFieldOptions.find((attr: any) => attr.label === fieldName);
      return attribute?.value?.type ?? 'text';
    };

    // Process conditions using the common utility
    const { matchConditions, dateConversions } = processFieldConditions(conditionsByField, getFieldType, query);
    if (Object.keys(dateConversions).length > 0) {
      aggregationPipeline.push({ $addFields: dateConversions });
    }


   const matchStage: any = { $and: [] };
  

  // collect user data conditions
    console.log('matchConditions', JSON.stringify(matchConditions),Object.keys(matchConditions).length);
    // Add match conditions derived from widget.conditions
    if (Object.keys(matchConditions).length > 0) {
      aggregationPipeline.push({ $match: matchConditions });
    }

  // Collect filter conditions
  if (filterConditions.length > 0) {
    matchStage.$and.push(...filterConditions);
  }

  // Remove conflicting search conditions
  if (searchConditions.length > 0) {
    const filterFields = new Set(
      filterConditions.flatMap(fc => Object.keys(fc))
    );

    const cleanedSearchConditions = searchConditions.filter(sc => {
      const field = Object.keys(sc)[0];
      return !filterFields.has(field);
    });

    if (cleanedSearchConditions.length > 0) {
      matchStage.$and.push({ $or: cleanedSearchConditions });
    }
  }

  // Only push if not empty
  if (matchStage.$and.length > 0) {
    aggregationPipeline.push({ $match: matchStage });
  }


    // before pagination
aggregationPipeline.push({
  $group: {
    _id: "$_id",
    doc: { $first: "$$ROOT" }
  }
});
aggregationPipeline.push({ $replaceRoot: { newRoot: "$doc" } });

    // Step 3: Sort
    const finalSort: Record<string, 1 | -1> = {};
    if (sort && Object.keys(sort).length > 0) {
      for (const key in sort) finalSort[`rowData.${key}`] = sort[key];
    } else finalSort.updatedAt = -1;

    aggregationPipeline.push({ $sort: finalSort }, { $skip: (page - 1) * limit }, { $limit: limit });

    // Step 4: Projection
    if (select) {
      const projectionFields = select.split(' ').reduce((acc: any, field: string) => {
        acc[field] = 1;
        return acc;
      }, {});
      aggregationPipeline.push({ $project: projectionFields });
    }
    console.log('aggregationPipeline',JSON.stringify(aggregationPipeline));
    // Step 5: Execute aggregation
    const versionValueData = await DataSourceVersionValue.aggregate(aggregationPipeline).exec();

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
          const relatedDocs: any[] = await RefModel.find({ _id: refValue, 'status': 'active' }).lean();
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
            const relatedDocs: any[] = await RefModel.find({ [`rowData.${displayField}`]: doc._id, 'status': 'active' }).lean();

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
            // console.log('doc.rowData.${topLevelAttribute}_resolved._id', `doc.rowData.${topLevelAttribute}_resolved`);
            // Find the document(s) where display field matches parent _id
            const resolvedObj = doc.rowData[`${topLevelAttribute}_resolved`];
            if (!resolvedObj) continue;

            const parentId = resolvedObj._id; // this is the ObjectId you want

            const relatedDocs: any[] = await RefModel.find({ [`rowData.${displayField}`]: parentId, 'status': 'active' }).lean();
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

    // Step 7: Count
    const countPipeline = aggregationPipeline.filter(
      (stage) => !('$skip' in stage || '$limit' in stage || '$project' in stage)
    );
    countPipeline.push({ $count: 'totalCount' });
    const countResult = await DataSourceVersionValue.aggregate(countPipeline).exec();
    const totalCount = countResult?.[0]?.totalCount || 0;

    return { data: transformedData, totalCount };
  } catch (err) {
    console.log('err',err);
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
