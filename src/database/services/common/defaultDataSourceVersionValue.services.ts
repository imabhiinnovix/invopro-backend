/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

/* eslint-disable @typescript-eslint/no-explicit-any */
import createDefaultDataSourceVersionModel from '../../models/common/defaultDataSourceVersionModel';
import { Model, Document, AnyBulkWriteOperation, Types } from 'mongoose';
import { findEntityById, getEntityFieldOptions } from './entity.services';
import {
  getAttributeByName,
  getEntityAttribute,
  getModelForEntity,
  resolveFieldPath,
} from '../../../utils/entity.utils';
import { getDerivedField } from './derivedField.services';
import { processFieldConditions } from '../../../utils/conditionProcessor';
import { escapeRegExp, getLabelByMappedAttributeName, transformRowDataWithLabels } from '../../../utils/common.utils';

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
            status: "active"
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
  searchFilters = {}
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
}) => {
  try {
    const DataSourceVersionValue = createDefaultDataSourceVersionModel(schemaName);
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

    const aggregationPipeline: any[] = [{ $match: query }];

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
  const filterString = filtersForLookup[field] ? JSON.stringify(filtersForLookup[field]) : '';
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
    













    // Step 2: Filters (unchanged)

    function buildDateFilter(key: string, val: any, attr: any) {
      if (attr?.type === "date-range" && val?.startDate && val?.endDate) {
        return {
          [`${key}`]: {
            $gte: new Date(val.startDate),
            $lte: new Date(val.endDate),
          },
        };
      }

      if (attr?.type === "date" && typeof val === "string") {
        return {
          [`${key}`]: { $eq: new Date(val) },
        };
      }

      return null; // not a date filter
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

            if (cond.operator === 'equals') conditionExpressions.push({ [path]: cond.matchValues[0] });
            else if (cond.operator === 'in') conditionExpressions.push({ [path]: { $in: cond.matchValues } });
            else if (cond.operator === 'not_in') conditionExpressions.push({ [path]: { $nin: cond.matchValues } });
            else if (cond.operator === 'exists') conditionExpressions.push({ [path]: { $exists: true, $ne: null } });
            else if (cond.operator === 'not_exists') conditionExpressions.push({ [path]: { $in: [null, undefined] } });
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

   const matchStage: any = { $and: [] };

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

    // Step 7: Count
    const countPipeline = aggregationPipeline.filter(
      (stage) => !('$skip' in stage || '$limit' in stage || '$project' in stage)
    );
    countPipeline.push({ $count: 'totalCount' });
    const countResult = await DataSourceVersionValue.aggregate(countPipeline).exec();
    const totalCount = countResult?.[0]?.totalCount || 0;

    return { data: transformedData, totalCount };
  } catch (err) {
    throw err;
  }
};

/**
 * Add dueDays custom dimension + bucket + Total bucket
 * - Pending → (dueDate - today)
 * - Completed → (today - DateTaken)
 */
async function addDueDaysDimensionWithTotal({
  aggregationPipeline,
  dashboardFilters,
  dimension = [],
  groupBy = [],
  dashBoardType,
  getReferenceField,
  getLabelByMappedAttributeName,
  dataSourceDetails,
}: {
  aggregationPipeline: any[];
  dashboardFilters?: any;
  dimension?: string[];
  groupBy?: string[];
  dashBoardType?: string;
  getReferenceField?: (field: string) => Promise<string>;
  getLabelByMappedAttributeName?: (details: any) => Promise<Record<string, string>>;
  dataSourceDetails?: any;
}) {
  const statusFilter = dashboardFilters?.filters?.["Derived.Status"] ?? "Pending";
  const isCompleted = statusFilter === "Completed";

  // Step 1: Compute dueDays
  const sourceField = isCompleted ? "$rowData.DateTaken" : "$rowData.DueDate";
  aggregationPipeline.push({
    $addFields: {
      dueDays: isCompleted
        ? { $dateDiff: { startDate: sourceField, endDate: "$$NOW", unit: "day" } }
        : { $dateDiff: { startDate: "$$NOW", endDate: sourceField, unit: "day" } },
    },
  });

  // Step 2: Bucket dueDays
  aggregationPipeline.push({
    $addFields: {
      dueBucket: {
        $switch: {
          branches: isCompleted
            ? [
                { case: { $and: [{ $gte: ["$dueDays", 0] }, { $lte: ["$dueDays", 30] }] }, then: "0-1 Months" },
                { case: { $and: [{ $gte: ["$dueDays", 31] }, { $lte: ["$dueDays", 90] }] }, then: "2-3 Months" },
                { case: { $and: [{ $gte: ["$dueDays", 91] }, { $lte: ["$dueDays", 180] }] }, then: "4-6 Months" },
                { case: { $and: [{ $gte: ["$dueDays", 181] }, { $lte: ["$dueDays", 365] }] }, then: "7-12 Months" },
              ]
            : [
                { case: { $and: [{ $gte: ["$dueDays", 0] }, { $lte: ["$dueDays", 3] }] }, then: "0-3 Days" },
                { case: { $and: [{ $gte: ["$dueDays", 4] }, { $lte: ["$dueDays", 7] }] }, then: "4-7 Days" },
                { case: { $and: [{ $gte: ["$dueDays", 8] }, { $lte: ["$dueDays", 15] }] }, then: "8-15 Days" },
                { case: { $and: [{ $gte: ["$dueDays", 16] }, { $lte: ["$dueDays", 30] }] }, then: "16-30 Days" },
              ],
          default: null,
        },
      },
    },
  });

  aggregationPipeline.push({ $match: { dueBucket: { $ne: null } } });

  // Step 3: Build group fields (dimension vs groupBy swap)
  const groupFields: Record<string, any> = {};
  const hasDueDaysInDimension = dimension.includes("dueDays");
  const hasDueDaysInGroupBy = groupBy.includes("dueDays");

  if (hasDueDaysInDimension) {
    groupFields["name"] = "$dueBucket";

    for (const field of groupBy) {
      if (field === "dueDays") continue;
      const labelArr = await getLabelByMappedAttributeName?.(dataSourceDetails) ?? {};
      const label = labelArr[field] ?? field;
      groupFields[label] = `$${await getReferenceField?.(field)}`;
    }
  } else if (hasDueDaysInGroupBy) {
    for (const fieldRaw of dimension) {
      if (fieldRaw === dimension[0]) {
        groupFields["name"] =
          dashBoardType === "trend"
            ? `$${fieldRaw}`
            : `$${await getReferenceField?.(fieldRaw)}`;
      } else {
        const labelArr = await getLabelByMappedAttributeName?.(dataSourceDetails) ?? {};
        const label = labelArr[fieldRaw] ?? fieldRaw;
        groupFields[label] = `$${await getReferenceField?.(fieldRaw)}`;
      }
    }

    groupFields["dueBucket"] = "$dueBucket";
  }

  // Step 4: Group + reshape
  aggregationPipeline.push({
    $group: {
      _id: groupFields,
      data: { $sum: 1 },
    },
  });

  aggregationPipeline.push({
    $replaceRoot: {
      newRoot: { $mergeObjects: ["$_id", { data: "$data" }] },
    },
  });

// Step 5: Re-group by groupBy fields only (use label-mapped names)
const labelMap = (await getLabelByMappedAttributeName?.(dataSourceDetails)) ?? {};

aggregationPipeline.push({
  $group: {
    _id: Object.fromEntries(
      groupBy.map((g) => {
        const fieldKey = g.split(".").pop();
        const label = labelMap[g] ?? fieldKey;
        return [label, `$${label}`];
      })
    ),
    data: { $push: "$$ROOT" },
    total: { $sum: "$data" },
  },
});

// Step 6: Add one "Total" row per group (preserve group labels)
aggregationPipeline.push({
  $project: {
    _id: 0,
    widgetData: {
      $concatArrays: [
        "$data",
        [
          {
            name: isCompleted ? "Total Completed" : "Total Dues",
            data: "$total",
            // include group label fields into total row
            ...Object.fromEntries(
              groupBy.map((g) => {
                const fieldKey = g.split(".").pop();
                const label = labelMap[g] ?? fieldKey;
                return [label, `$_id.${label}`];
              })
            ),
          },
        ],
      ],
    },
    totalCount: "$total",
  },
});


 // Step 7: Assign custom sort order for buckets
  const bucketOrder = isCompleted
    ? ["0-1 Months", "2-3 Months", "4-6 Months", "7-12 Months", "Total Completed"]
    : ["0-3 Days", "4-7 Days", "8-15 Days", "16-30 Days", "Total Dues"];

  aggregationPipeline.push({
    $addFields: {
      widgetData: {
        $map: {
          input: "$widgetData",
          as: "item",
          in: {
            $mergeObjects: [
              "$$item",
              { sortOrder: { $indexOfArray: [bucketOrder, "$$item.name"] } },
            ],
          },
        },
      },
    },
  });
aggregationPipeline.push({ $unwind: "$widgetData" });
aggregationPipeline.push({ $replaceRoot: { newRoot: "$widgetData" } });
aggregationPipeline.push({
  $sort: { sortOrder: 1, ReportCriticalEvent: 1 },
});

aggregationPipeline.push({
  $project: { sortOrder: 0 },
});

// Step 8: Final regroup for global totalCount
aggregationPipeline.push({
  $group: {
    _id: null,
    widgetData: { $push: "$$ROOT" },
    totalCount: { $sum: "$data" },
  },
});

aggregationPipeline.push({
  $project: {
    _id: 0,
    widgetData: 1,
    totalCount: 1,
  },
});


}





export const getDataSourceVersionValueV2 = async ({
  schemaName,
  query,
  dashboardFilters = {},
  entityId = '',
  dimension = [],
  groupBy = [],
  aggregation,
  conditions,
  widgetType,
  dashBoardType,
  dataSourceDetails
}: {
  schemaName: string;
  query: any;
  select?: string;
  dashboardFilters?: Record<string, any>;
  entityId: any;
  dimension?: string[];
  groupBy?: string[];
  aggregation: { type: string; attributeName: string };
  conditions?: any[];
  widgetType?: string;
  dashBoardType?: string;
  dataSourceDetails?: Record<string, any>;
  
}) => {
  try {
    const DataSourceVersionValue = createDefaultDataSourceVersionModel(schemaName);
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
  const asField = prefix.endsWith(`${field}_resolved`)? prefix : `${prefix}.${field}_resolved`;
  const fullPath = [...pathSegments].join('.');
  const filterString = filtersForLookup[field] ? JSON.stringify(filtersForLookup[field]) : '';
  const lookupKey = `${entityId}:${fullPath}:${filterString}`;

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
      }else if (
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

/**
 * Builds the $lookup stages for nested references and returns the aggregation path string.
 */
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






// Helper to build filter value (regex for strings)
  const buildFilterForValue = (v: any) =>
    typeof v === "string"
      ? { $regex: `^${escapeRegExp(v.trim())}$`, $options: "i" }
      : v;


    













    // Step 2: Filters (unchanged)
    function buildDateFilter(key: string, val: any, attr: any) {
      if (attr?.type === "date-range" && val?.startDate && val?.endDate) {
        return {
          [`${key}`]: {
            $gte: new Date(val.startDate),
            $lte: new Date(val.endDate),
          },
        };
      }

      if (attr?.type === "date" && typeof val === "string") {
        return {
          [`${key}`]: { $eq: new Date(val) },
        };
      }

      return null; // not a date filter
  }
    const filterConditions: any[] = [];
    const visited = new Set<string>();
    const filters = dashboardFilters?.filters ?? {};
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

            if (cond.operator === 'equals') conditionExpressions.push({ [path]: cond.matchValues[0] });
            else if (cond.operator === 'in') conditionExpressions.push({ [path]: { $in: cond.matchValues } });
            else if (cond.operator === 'not_in') conditionExpressions.push({ [path]: { $nin: cond.matchValues } });
            else if (cond.operator === 'exists') conditionExpressions.push({ [path]: { $exists: true, $ne: null } });
            else if (cond.operator === 'not_exists') conditionExpressions.push({ [path]: { $in: [null, undefined] } });
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

   const matchStage: any = { $and: [] };

  // Collect filter conditions
  if (filterConditions.length > 0) {
    matchStage.$and.push(...filterConditions);
  }

  // Only push if not empty
  if (matchStage.$and.length > 0) {
    aggregationPipeline.push({ $match: matchStage });
  }
  console.log('dashboardFilters', JSON.stringify(dashboardFilters), JSON.stringify(aggregationPipeline));
  
   // Step 3: Build group-by keys
  // Helper function to get field path
  const getFieldPath = (fieldName: string) => {
    return `$${fieldName}`;
  };

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


  const groupFields: Record<string, any> = {};

// Handle custom dimension "dueDays"
if (![...(dimension || []), ...(groupBy || [])].includes("dueDays")) {
  // Normal fields
  for (const fieldRaw of [...(dimension || []), ...(groupBy || [])]) {
    let field = fieldRaw;

    if (fieldRaw === dimension?.[0]) {
      if (dashBoardType === "trend") {
        groupFields["name"] = getFieldPath(`${field}`);
      } else {
        groupFields["name"] = getFieldPath(await getReferenceField(field));
      }
    } else {
      const labelArr = await getLabelByMappedAttributeName(dataSourceDetails);
      const label = labelArr[field] ?? field;
      groupFields[label] = getFieldPath(await getReferenceField(field));
    }
  }
}

console.log(groupFields, 'groupFields');








    // const groupKeys = [...(groupBy || [])];
    // if (dimension) groupKeys.unshift(dimension[0]);

    // const groupObject: Record<string, any> = {};
    // console.log(groupKeys, 'groupKeys', dimension);
    // for (const key of groupKeys) {
    //   let path: string;
    //   const visited = new Set<string>();
    //   if (key.includes('.')) {
    //     const pathSegments = key.split('.');

    //     path = await buildAggregationPathAndReturnExpr({
    //       entityId,
    //       pathSegments,
    //       pipeline: aggregationPipeline,
    //       visited,
    //     });

    //     path = `$${path}`;
        
    //   } else {
    //     path = `$rowData.${key}`;
    //   }

    //   // Replace dots with underscores for field names used in the group _id
    //   const safeField = key === dimension[0] ? 'name' : key.replace(/\./g, '_');

    //   groupObject[safeField] =  { "$ifNull": [path, "Unknown"] };
    // }
    

    const conditionsByField: Record<string, any[]> = {};
console.log("payload conditions", JSON.stringify(conditions));

for (const condition of conditions || []) {
  const originalField = condition.field;
  let resolvedFieldPath = await getReferenceField(originalField);
  // const visited = new Set<string>();

  // if (originalField.includes(".")) {
  //   // Reference field
  //   const pathSegments = originalField.split(".");
  //   resolvedFieldPath = await buildAggregationPathAndReturnExpr({
  //     entityId,
  //     pathSegments,
  //     pipeline: aggregationPipeline,
  //     visited,
  //   });
    resolvedFieldPath =  resolvedFieldPath.replace(/^rowData\./, '');
  // } else {
  //   // Direct field
  //   resolvedFieldPath = `${originalField}`;
  // }

  // Overwrite field name with resolved path
  const processedCondition = {
    ...condition,
    field: resolvedFieldPath,
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
    console.log('matchConditions', JSON.stringify(matchConditions));
    if (Object.keys(dateConversions).length > 0) {
      aggregationPipeline.push({ $addFields: dateConversions });
    }

    // Add match conditions derived from widget.conditions
    if (Object.keys(matchConditions).length > 0) {
      aggregationPipeline.push({ $match: matchConditions });
    }

    const aggPath = getFieldPath(await getReferenceField(aggregation?.attributeName));
    
    // if (aggregation?.attributeName.includes('.')) {
    //   const visited = new Set<string>();
    //   const pathSegments = aggregation.attributeName.split('.');

    //   aggPath = await buildAggregationPathAndReturnExpr({
    //     entityId,
    //     pathSegments,
    //     pipeline: aggregationPipeline,
    //     visited,
    //   });

    //   console.log(aggPath, 'aggPath...');
    //   // const [refField, ...subFields] = aggregation.attributeName.split('.');
    //   // aggPath = `$rowData.${refField}_resolved.rowData.${subFields.join('.')}`;
    // } else {
    //   aggPath = `$rowData.${aggregation?.attributeName}`;
    // }
    console.log(aggPath, 'aggPath');
    let aggregationExpr;
    switch (aggregation?.type) {
      case 'Count':
        aggregationExpr = { count: { $sum: 1 } };
        break;
      case 'Sum':
        aggregationExpr = { total: { $sum: aggPath } };
        break;
      case 'Average':
        aggregationExpr = { average: { $avg: aggPath } };
        break;
      default:
        aggregationExpr = { count: { $sum: 1 } };
    }

    if (widgetType === 'number') {
      aggregationPipeline.push(
        { $addFields: { name: 'Total' } },
        {
          $group: {
            _id: { name: '$name' },
            data: aggregationExpr[Object.keys(aggregationExpr)[0]],
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ['$_id', { name: '$name', data: '$data' }],
            },
          },
        },
        {
          $group: {
            _id: null,
            data: { $push: '$$ROOT' },
            total: { $sum: '$data' },
          },
        },
        {
          $project: {
            _id: 0,
            data: 1,
            total: 1,
          },
        },
        {
          $replaceRoot: { newRoot: { widgetData: '$data', totalCount: '$total' } },
        }
      );
    } else{
     if([...(dimension || []), ...(groupBy || [])].includes("dueDays")) {
      await addDueDaysDimensionWithTotal({
        aggregationPipeline,
        dashboardFilters,
        dimension,
        groupBy,
        dashBoardType,
        getReferenceField,
        getLabelByMappedAttributeName,
        dataSourceDetails,
      });

      // For charting, name will be bucket labels ("0-3 days left", etc.)
      groupFields["name"] = "$_id"; 
    }else{
      aggregationPipeline.push(
        {
          $group: {
            _id: {
              ...groupFields
            },
            ...aggregationExpr,
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                '$_id',
                {
                  data: `$${Object.keys(aggregationExpr)[0]}`,
                },
              ],
            },
          },
        },
        {
          $match: {
            name: { $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            data: { $push: '$$ROOT' },
            total: { $sum: '$data' },
          },
        },
        {
          $project: {
            _id: 0,
            data: 1,
            total: 1,
          },
        },
        {
          $replaceRoot: { newRoot: { widgetData: '$data', totalCount: '$total' } },
        }
      );

      if (dashBoardType === 'trend') {
        aggregationPipeline.push({ $sort: { name: 1 } });
      } else {
        aggregationPipeline.push({ $sort: { data: 1 } });
      }
    }
  }
    
    
    console.log('aggregationPipeline',JSON.stringify(aggregationPipeline));
    // Step 5: Execute aggregation
    const versionValueData = await DataSourceVersionValue.aggregate(aggregationPipeline).exec();

    console.log('versionValueData',JSON.stringify(versionValueData));

    // -------------------------
    // Helper: Resolve reference/mapping attributes (reuse your original logic)
    // -------------------------
    // async function resolveRefAttribute(
    //   attr: any,
    //   refResolved: any,
    //   key: string,
    //   rowData: Record<string, any>,
    //   currentAttr?: any
    // ) {
    //   if (!refResolved) return;

    //   let displayField: string | undefined;
    //   if (attr.referenceEntitySetting?.refEntityField) {
    //     const refFieldAttr = await getEntityAttribute(
    //       attr.referenceEntitySetting.refEntityId,
    //       attr.referenceEntitySetting.refEntityField
    //     );
    //     displayField = refFieldAttr?.name;
    //   }
    //   // console.log('attr',attr);
    //   // Original many-to-one logic
    //   if (
    //     currentAttr &&
    //     ['mapping_one_to_one', 'mapping_many_to_one'].includes(currentAttr?.referenceEntitySetting?.relationType)
    //   ) {
    //     const refFieldAttr = await getEntityAttribute(
    //       attr.referenceEntitySetting.refEntityId,
    //       attr.referenceEntitySetting.refEntityField
    //     );
    //     const refFieldName = refFieldAttr?.name;
    //     // console.log('refFieldName',refFieldName,refResolved?.rowData);
    //     if (refFieldName && refResolved?.rowData?.[refFieldName]) {
    //       const refValue = refResolved.rowData[refFieldName];
    //       const RefModel = await getModelForEntity(attr.referenceEntitySetting.refEntityId);
    //       // console.log('refFieldName',refFieldName, refValue);
    //       const relatedDocs: any[] = await RefModel.find({ _id: refValue }).lean();
    //       // console.log('relatedDocs',relatedDocs);
    //       if (currentAttr.referenceEntitySetting?.relationType == 'mapping_one_to_one') {
    //         for (const r of relatedDocs) {
    //           for (const subKey in r.rowData) {
    //             // console.log('subKey',refFieldName,key );
    //             // if (subKey === refFieldName) continue;
    //             const arrayKey = `${key}.${subKey}`;
    //             // console.log('arrayKey',arrayKey);
    //             const value = r.rowData[subKey];
    //             if (value !== undefined) rowData[arrayKey] = value;
    //           }
    //         }
    //       } else {
    //         for (const r of relatedDocs) {
    //           for (const subKey in r.rowData) {
    //             // console.log('subKey',refFieldName,key );
    //             // if (subKey === refFieldName) continue;
    //             const arrayKey = `${key}.${subKey}`;
    //             // console.log('arrayKey',arrayKey);
    //             if (!Array.isArray(rowData[arrayKey])) rowData[arrayKey] = [];
    //             const value = r.rowData[subKey];
    //             // console.log('value',value, subKey);
    //             if (Array.isArray(value)) rowData[arrayKey].push(...value);
    //             else if (value !== undefined) rowData[arrayKey].push(value);
    //             // remove duplicates
    //             rowData[arrayKey] = Array.from(new Set(rowData[arrayKey]));
    //           }
    //         }
    //       }
    //       // console.log('rowData',rowData);
    //       // Remove duplicates
    //       // for (const subKey in rowData) {
    //       //   if (subKey.startsWith(`${key}.`) && Array.isArray(rowData[subKey])) rowData[subKey] = [...new Set(rowData[subKey])];
    //       // }

    //       // // Set main field
    //       // rowData[`${key}.${refFieldName}`] = refResolved.rowData[refFieldName];
    //       // rowData[key] = displayField && refResolved.rowData[displayField] !== undefined
    //       //   ? refResolved.rowData[displayField]
    //       //   : Object.values(refResolved.rowData)[0];
    //     }
    //   }
    //   // Default one-to-one or array
    //   else if (Array.isArray(refResolved)) {
    //     const displayValues: string[] = [];
    //     for (const ref of refResolved) {
    //       if (!ref?.rowData) continue;
    //       for (const subKey in ref.rowData) {
    //         const arrayKey = `${key}.${subKey}`;
    //         if (!Array.isArray(rowData[arrayKey])) rowData[arrayKey] = [];
    //         const value = ref.rowData[subKey];
    //         if (Array.isArray(value)) rowData[arrayKey].push(...value);
    //         else if (value !== undefined) rowData[arrayKey].push(value);
    //       }
    //       const displayVal =
    //         displayField && ref.rowData[displayField] !== undefined
    //           ? ref.rowData[displayField]
    //           : Object.values(ref.rowData)[0];
    //       displayValues.push(displayVal);
    //     }
    //     rowData[key] = displayValues;
    //   } else if (refResolved && refResolved.rowData) {
    //     const refRowData = refResolved.rowData;
    //     for (const subKey in refRowData) rowData[`${key}.${subKey}`] = refRowData[subKey];
    //     rowData[key] =
    //       displayField && refRowData[displayField] !== undefined
    //         ? refRowData[displayField]
    //         : Object.values(refRowData)[0];
    //   }
    // }
    // function getTopLevelAttribute(dotKey: string): string {
    //   return dotKey.split('.')[0]; // take everything before first dot
    // }

    // Step 6: Transform
    // Step 6: Transform widgetData
const rawData = versionValueData[0] || { widgetData: [], totalCount: 0 };

// const transformedData = await Promise.all(
//   rawData.widgetData.map(async (doc: any) => {
//     const newDoc = { ...doc };
//     const key = aggregation?.attributeName;

//     // Check attribute in maps
//     const attr = attributesMap[key] || refAttributesMap[key];
//     if (!attr) return newDoc;

//     // Mapping reference
//     if (attr.referenceEntitySetting?.relationType?.startsWith("mapping_")) {
//       const RefModel = await getModelForEntity(attr.referenceEntitySetting.refEntityId);
//       const refFieldAttr = await getEntityAttribute(
//         attr.referenceEntitySetting.refEntityId,
//         attr.referenceEntitySetting.refEntityField
//       );
//       const displayField = refFieldAttr?.name;

//       if (displayField) {
//         const relatedDocs: any = await RefModel.find({ _id: doc.name }).lean();
//         if (relatedDocs.length > 0) {
//           newDoc.name = relatedDocs.map((r) => r.rowData?.[displayField]).filter(Boolean).join(", ");
//         }
//       }
//     }
//     // Normal reference
//     else if (attr.referenceEntitySetting?.refEntityId) {
//       const RefModel = await getModelForEntity(attr.referenceEntitySetting.refEntityId);
//       const refFieldAttr = await getEntityAttribute(
//         attr.referenceEntitySetting.refEntityId,
//         attr.referenceEntitySetting.refEntityField
//       );
//       const displayField = refFieldAttr?.name || attr.referenceEntitySetting.refEntityField;

//       const resolvedDoc: any = await RefModel.findById(doc.name).lean();
//       if (resolvedDoc?.rowData?.[displayField]) {
//         newDoc.name = resolvedDoc.rowData[displayField];
//       }
//     }
//     // Primitive field (like FOEmail or "Unknown")
//     else {
//       newDoc.name = doc.name; // keep as-is
//     }

//     return newDoc;
//   })
// );

// return {
//   widgetData: transformedData,
//   totalCount: rawData.totalCount
// };

return rawData;

   

  } catch (err) {
    throw err;
  }
};


export const getDataSourceVersionValueWidgetDataV2 = async ({
  schemaName,
  query,
  dashboardFilters = {},
  entityId = '',
  dimension = [],
  groupBy = [],
  aggregation,
  conditions,
  widgetType,
  dashBoardType,
  dataSourceDetails,
  page,
  limit
}: {
  schemaName: string;
  query: any;
  select?: string;
  dashboardFilters?: Record<string, any>;
  entityId: any;
  dimension?: string[];
  groupBy?: string[];
  aggregation: { type: string; attributeName: string };
  conditions?: any[];
  widgetType?: string;
  dashBoardType?: string;
  dataSourceDetails?: Record<string, any>;
  isPaginate?: boolean,
  page: number,
  limit: number
  
}) => {
  try {
    console.log('dashboardFilters',dashboardFilters);
    const DataSourceVersionValue = createDefaultDataSourceVersionModel(schemaName);
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
  const asField = prefix.endsWith(`${field}_resolved`)? prefix : `${prefix}.${field}_resolved`;
  const fullPath = [...pathSegments].join('.');
  const filterString = filtersForLookup[field] ? JSON.stringify(filtersForLookup[field]) : '';
  const lookupKey = `${entityId}:${fullPath}:${filterString}`;

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
      }else if (
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

/**
 * Builds the $lookup stages for nested references and returns the aggregation path string.
 */
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






// Helper to build filter value (regex for strings)
  const buildFilterForValue = (v: any) =>
    typeof v === "string"
      ? { $regex: `^${escapeRegExp(v.trim())}$`, $options: "i" }
      : v;


    













    // Step 2: Filters (unchanged)
    function buildDateFilter(key: string, val: any, attr: any) {
      if (attr?.type === "date-range" && val?.startDate && val?.endDate) {
        return {
          [`${key}`]: {
            $gte: new Date(val.startDate),
            $lte: new Date(val.endDate),
          },
        };
      }

      if (attr?.type === "date" && typeof val === "string") {
        return {
          [`${key}`]: { $eq: new Date(val) },
        };
      }

      return null; // not a date filter
  }
    const filterConditions: any[] = [];
    const visited = new Set<string>();
    const filters = dashboardFilters?.filters ?? {};
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

            if (cond.operator === 'equals') conditionExpressions.push({ [path]: cond.matchValues[0] });
            else if (cond.operator === 'in') conditionExpressions.push({ [path]: { $in: cond.matchValues } });
            else if (cond.operator === 'not_in') conditionExpressions.push({ [path]: { $nin: cond.matchValues } });
            else if (cond.operator === 'exists') conditionExpressions.push({ [path]: { $exists: true, $ne: null } });
            else if (cond.operator === 'not_exists') conditionExpressions.push({ [path]: { $in: [null, undefined] } });
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

   const matchStage: any = { $and: [] };

  // Collect filter conditions
  if (filterConditions.length > 0) {
    matchStage.$and.push(...filterConditions);
  }

  // Only push if not empty
  if (matchStage.$and.length > 0) {
    aggregationPipeline.push({ $match: matchStage });
  }
  console.log('dashboardFilters', JSON.stringify(dashboardFilters), JSON.stringify(aggregationPipeline));
  
   // Step 3: Build group-by keys
  // Helper function to get field path
  const getFieldPath = (fieldName: string) => {
    return `$${fieldName}`;
  };

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
    ...condition,
    field: resolvedFieldPath,
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
    console.log('matchConditions', JSON.stringify(matchConditions));
    if (Object.keys(dateConversions).length > 0) {
      aggregationPipeline.push({ $addFields: dateConversions });
    }

    // Add match conditions derived from widget.conditions
    if (Object.keys(matchConditions).length > 0) {
      aggregationPipeline.push({ $match: matchConditions });
    }

    

  // ✅ Add pagination only if paginate object is valid
    aggregationPipeline.push(
  {
    $facet: {
      metadata: [{ $count: 'totalRecords' }],
      data: [
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ],
    },
  },
  {
    $project: {
      data: 1,
      pagination: {
        // currentPage: { $literal: page },   // wrap in $literal
        // limit: { $literal: limit },        // wrap in $literal
        totalRecords: { $arrayElemAt: ['$metadata.totalRecords', 0] },
        totalPages: {
          $ceil: {
            $divide: [
              { $arrayElemAt: ['$metadata.totalRecords', 0] },
              limit,
            ],
          },
        },
      },
    },
  }
);

  
    
    
    console.log('aggregationPipeline',JSON.stringify(aggregationPipeline));
    // Step 5: Execute aggregation
    const versionValueData = await DataSourceVersionValue.aggregate(aggregationPipeline).exec();

    console.log('versionValueData',JSON.stringify(versionValueData));

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
      versionValueData[0]['data'].map(async (doc: any) => {
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
        const transformRowData = await transformRowDataWithLabels(rowData, dataSourceDetails);
        return transformRowData;
      })
    );

    return { data: transformedData, pagination: versionValueData[0]?.pagination };

   

  } catch (err) {
    throw err;
  }
};

export const getDataSourceVersionValueV2Backup = async ({
  schemaName,
  query,
  filters = {},
  entityId = '',
  dimension = '',
  groupBy = [],
  aggregation,
  conditions,
  widgetType,
}: {
  schemaName: string;
  query: any;
  select?: string;
  filters?: Record<string, any>;
  entityId: any;
  dimension?: string;
  groupBy?: string[];
  aggregation?: { type: string; attributeName: string };
  conditions?: any[];
  widgetType?: string;
}) => {
  try {
    const DataSourceVersionValue = createDefaultDataSourceVersionModel(schemaName);
    const entity: any = await findEntityById(entityId);

    // FIX: Properly typed map
    const attributesMap: Record<string, any> = entity.attributes.reduce(
      (acc, attr) => {
        acc[attr.name] = attr;
        return acc;
      },
      {} as Record<string, any>
    );

    const aggregationPipeline: any[] = [{ $match: query }];

    // Step 1: Lookups for all reference fields
    for (const [attrName, attr] of Object.entries(attributesMap)) {
      if (attr.referenceEntitySetting?.refEntityId) {
        const refEntityId = attr.referenceEntitySetting.refEntityId;
        const localField = `rowData.${attrName}`;
        const asField = `rowData.${attrName}_resolved`;

        const refModel = await getModelForEntity(refEntityId);
        // console.log(refModel);

        if (!aggregationPipeline.some((stage) => stage.$lookup?.as === asField)) {
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
      }
    }

    // console.log(aggregationPipeline);

    // Step 2: Handle filters
    const filterConditions: any[] = [];
    for (const [key, val] of Object.entries(filters)) {
      if (key.startsWith('Derived.')) {
        const derivedName = key.split('.')[1];
        const derivedField = await getDerivedField({
          name: derivedName,
          entityId: entityId,
        });

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
            } else if (cond.operator === 'in') {
              conditionExpressions.push({ [path]: { $in: cond.matchValues } });
            } else if (cond.operator === 'not_in') {
              conditionExpressions.push({ [path]: { $nin: cond.matchValues } });
            } else if (cond.operator === 'exists') {
              conditionExpressions.push({ [path]: { $exists: true, $ne: null } });
            } else if (cond.operator === 'not_exists') {
              conditionExpressions.push({
                $or: [{ [path]: { $exists: false } }, { [path]: { $in: [null, undefined, ''] } }],
              });
            } else if (cond.operator === 'match_case_insensitive_array') {
              const regexArray = (cond.matchValues || []).map((val: string) => ({
                [path]: { $regex: `^${val}$`, $options: 'i' },
              }));

              if (regexArray.length > 0) {
                conditionExpressions.push({ $or: regexArray });
              }
            } else if (cond.operator === 'not_match_case_insensitive_array') {
              const regexArray = (cond.matchValues || []).map((val: string) => ({
                [path]: { $regex: `^${val}$`, $options: 'i' },
              }));

              if (regexArray.length > 0) {
                // Wrap each regex in $nor to negate it
                conditionExpressions.push({
                  $nor: regexArray,
                });
              }
            }
          }

          if (conditionExpressions.length > 0) {
            derivedRuleConditions.push(
              rule.conditionOperator === 'OR' ? { $or: conditionExpressions } : { $and: conditionExpressions }
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
          [`${asField}.rowData.${subField}`]: Array.isArray(val) ? { $in: val } : val,
        });
      } else {
        filterConditions.push({
          [`rowData.${key}`]: Array.isArray(val) ? { $in: val } : val,
        });
      }
    }
    // console.log('filterConditions',filterConditions);
    if (filterConditions.length > 0) {
      aggregationPipeline.push({ $match: { $and: filterConditions } });
    }

    // Step 3: Build group-by keys
    const groupKeys = [...(groupBy || [])];
    if (dimension) groupKeys.unshift(dimension);

    const groupObject: Record<string, any> = {};
    console.log(groupKeys, 'groupKeys', dimension);
    for (const key of groupKeys) {
      let path: string;

      if (key.includes('.')) {
        const [refField, ...subFields] = key.split('.');
        path = `$rowData.${refField}_resolved.rowData.${subFields.join('.')}`;
      } else {
        path = `$rowData.${key}`;
      }

      // Replace dots with underscores for field names used in the group _id
      const safeField = key === dimension ? 'name' : key.replace(/\./g, '_');

      groupObject[safeField] = path;
    }
    console.log(groupObject, 'groupObject');

    const conditionsByField: Record<string, any[]> = {};

    conditions?.forEach((condition) => {
      const originalField = condition.field;

      let resolvedFieldPath: string;

      if (originalField.includes('.')) {
        // Reference field
        const [refField, ...subFields] = originalField.split('.');
        resolvedFieldPath = `${refField}_resolved.rowData.${subFields.join('.')}`;
      } else {
        // Direct field
        resolvedFieldPath = `${originalField}`;
      }

      // Overwrite field name with resolved path
      const processedCondition = {
        ...condition,
        field: resolvedFieldPath,
      };

      if (!conditionsByField[resolvedFieldPath]) {
        conditionsByField[resolvedFieldPath] = [];
      }

      conditionsByField[resolvedFieldPath].push(processedCondition);
    });

    const getFieldType = (fieldName: string) => {
      const attribute = entity.attributes.find((attr: any) => attr.name === fieldName);
      return attribute ? attribute.type : 'string';
    };

    // Process conditions using the common utility
    const { matchConditions, dateConversions } = processFieldConditions(conditionsByField, getFieldType, {});
    if (Object.keys(dateConversions).length > 0) {
      aggregationPipeline.push({ $addFields: dateConversions });
    }

    // Add match conditions derived from widget.conditions
    if (Object.keys(matchConditions).length > 0) {
      aggregationPipeline.push({ $match: matchConditions });
    }
    let aggPath: string;
    if (aggregation?.attributeName.includes('.')) {
      const [refField, ...subFields] = aggregation.attributeName.split('.');
      aggPath = `$rowData.${refField}_resolved.rowData.${subFields.join('.')}`;
    } else {
      aggPath = `$rowData.${aggregation?.attributeName}`;
    }
    console.log(aggPath, 'aggPath');
    let aggregationExpr;
    switch (aggregation?.type) {
      case 'Count':
        aggregationExpr = { count: { $sum: 1 } };
        break;
      case 'Sum':
        aggregationExpr = { total: { $sum: aggPath } };
        break;
      case 'Average':
        aggregationExpr = { average: { $avg: aggPath } };
        break;
      default:
        aggregationExpr = { count: { $sum: 1 } };
    }

    if (widgetType === 'number') {
      aggregationPipeline.push(
        { $addFields: { name: 'Total' } },
        {
          $group: {
            _id: { name: '$name' },
            data: aggregationExpr[Object.keys(aggregationExpr)[0]],
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ['$_id', { name: '$name', data: '$data' }],
            },
          },
        },
        {
          $group: {
            _id: null,
            data: { $push: '$$ROOT' },
            total: { $sum: '$data' },
          },
        },
        {
          $project: {
            _id: 0,
            data: 1,
            total: 1,
          },
        },
        {
          $replaceRoot: { newRoot: { widgetData: '$data', totalCount: '$total' } },
        }
      );
    } else {
      aggregationPipeline.push(
        {
          $group: {
            _id: groupObject,
            ...aggregationExpr,
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                '$_id',
                {
                  data: `$${Object.keys(aggregationExpr)[0]}`,
                },
              ],
            },
          },
        },
        {
          $match: {
            name: { $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            data: { $push: '$$ROOT' },
            total: { $sum: '$data' },
          },
        },
        {
          $project: {
            _id: 0,
            data: 1,
            total: 1,
          },
        },
        {
          $replaceRoot: { newRoot: { widgetData: '$data', totalCount: '$total' } },
        }
      );
    }

    console.log(JSON.stringify(aggregationPipeline));
    // Step 5: Execute
    const versionValueData = await DataSourceVersionValue.aggregate(aggregationPipeline).exec();
    console.log(versionValueData);

    return versionValueData && versionValueData.length > 0 ? versionValueData[0] : [];
  } catch (err) {
    throw err;
  }
};

/**
 * Find a single version value row by filter (e.g. _id, dataSourceVersionId)
 */
export const findOne = async (schemaName: string, filter: Record<string, any>): Promise<Record<string, any> | null> => {
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

export const deleteVersionValues = async (schemaName: string, filter: Record<string, any>) => {
  const Model = createDefaultDataSourceVersionModel(schemaName) as Model<Document>;

  // Soft delete: set status = "inactive"
  return await Model.updateMany(filter, {
    $set: { status: 'in-active', updatedAt: new Date() },
  });
  // Hard delete: remove documents entirely
  // return await Model.deleteMany(filter);
};
