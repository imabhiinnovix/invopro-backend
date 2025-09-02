/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

/* eslint-disable @typescript-eslint/no-explicit-any */
import createDefaultDataSourceVersionModel from '../../models/common/defaultDataSourceVersionModel';
import { Model, Document, AnyBulkWriteOperation, Types } from 'mongoose';
import { findEntityById } from './entity.services';
import { getAttributeByName, getEntityAttribute, getModelForEntity, resolveFieldPath } from '../../../utils/entity.utils';
import { getDerivedField } from './derivedField.services';
import { processFieldConditions } from '../../../utils/conditionProcessor';

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
    const entity: any = await findEntityById(entityId);

    // const attributesMap: Record<string, any> = entity.attributes.reduce((acc, attr) => {
    //   acc[attr.name] = attr;
    //   return acc;
    // }, {} as Record<string, any>);

  const attributesMap: Record<string, any> = {};
  const refAttributesMap: Record<string, any> = {};

  // Add direct attributes
  for (const attr of entity.attributes) {
    attributesMap[attr.name] = attr;

    // If this is a mapping relation, fetch referenced attributes
      if(attr?.referenceEntitySetting?.refEntityId){
      const refEntityId = attr.referenceEntitySetting.refEntityId.toString();
      const refEntity: any = await findEntityById(refEntityId);
      if (refEntity?.attributes) {
        for (const refAttr of refEntity.attributes) {
          // Avoid overwriting original key, prefix with mapping key
          const mapKey = `${attr.name}.${refAttr.name}`;
          if(refAttr?.referenceEntitySetting?.relationType.startsWith("mapping_")){
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
          aggregationPipeline.push({
            $lookup: {
              from: refModel.collection.name,
              localField,
              foreignField: '_id',
              as: asField,
            },
          });
          aggregationPipeline.push({
            $unwind: { path: `$${asField}`, preserveNullAndEmptyArrays: true },
          });
        }
      }
    }

    // Step 2: Filters (unchanged)
    const filterConditions: any[] = [];
    for (const [key, val] of Object.entries(filters)) {
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
            derivedRuleConditions.push(rule.conditionOperator === 'OR' ? { $or: conditionExpressions } : { $and: conditionExpressions });
          }
        }

        if (derivedRuleConditions.length > 0) filterConditions.push({ $or: derivedRuleConditions });

      } else if (key.includes('.')) {
        const [refField, subField] = key.split('.');
        const asField = `rowData.${refField}_resolved`;
        filterConditions.push({ [`${asField}.rowData.${subField}`]: Array.isArray(val) ? { $in: val } : val });
      } else {
        filterConditions.push({ [`rowData.${key}`]: Array.isArray(val) ? { $in: val } : val });
      }
    }

    if (filterConditions.length > 0) aggregationPipeline.push({ $match: { $and: filterConditions } });

    // Step 3: Sort
    const finalSort: Record<string, 1 | -1> = {};
    if (sort && Object.keys(sort).length > 0) {
      for (const key in sort) finalSort[`rowData.${key}`] = sort[key];
    } else finalSort.updatedAt = -1;

    aggregationPipeline.push({ $sort: finalSort }, { $skip: (page - 1) * limit }, { $limit: limit });

    // Step 4: Projection
    if (select) {
      const projectionFields = select.split(' ').reduce((acc: any, field: string) => { acc[field] = 1; return acc; }, {});
      aggregationPipeline.push({ $project: projectionFields });
    }

    // Step 5: Execute aggregation
    const versionValueData = await DataSourceVersionValue.aggregate(aggregationPipeline).exec();

    // -------------------------
    // Helper: Resolve reference/mapping attributes (reuse your original logic)
    // -------------------------
    async function resolveRefAttribute(attr: any, refResolved: any, key: string, rowData: Record<string, any>, currentAttr?: any) {
      if (!refResolved) return;

      let displayField: string | undefined;
      if (attr.referenceEntitySetting?.refEntityField) {
        const refFieldAttr = await getEntityAttribute(attr.referenceEntitySetting.refEntityId, attr.referenceEntitySetting.refEntityField);
        displayField = refFieldAttr?.name;
      }
      // console.log('attr',attr);
      // Original many-to-one logic
      if (currentAttr && ["mapping_one_to_one", "mapping_many_to_one"].includes(currentAttr?.referenceEntitySetting?.relationType)) {
        const refFieldAttr = await getEntityAttribute(attr.referenceEntitySetting.refEntityId, attr.referenceEntitySetting.refEntityField);
        const refFieldName = refFieldAttr?.name;
        // console.log('refFieldName',refFieldName,refResolved?.rowData);
        if (refFieldName && refResolved?.rowData?.[refFieldName]) {
          const refValue = refResolved.rowData[refFieldName];
          const RefModel = await getModelForEntity(attr.referenceEntitySetting.refEntityId);
          // console.log('refFieldName',refFieldName, refValue);
          const relatedDocs: any[] = await RefModel.find({ _id: refValue }).lean();
          // console.log('relatedDocs',relatedDocs);
          if(currentAttr.referenceEntitySetting?.relationType == "mapping_one_to_one"){
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
          }else{
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
          const displayVal = displayField && ref.rowData[displayField] !== undefined
            ? ref.rowData[displayField]
            : Object.values(ref.rowData)[0];
          displayValues.push(displayVal);
        }
        rowData[key] = displayValues;
      } else if (refResolved && refResolved.rowData) {
        const refRowData = refResolved.rowData;
        for (const subKey in refRowData) rowData[`${key}.${subKey}`] = refRowData[subKey];
        rowData[key] = displayField && refRowData[displayField] !== undefined
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
          console.log('attr',attr);
          // --------- Mapping attributes logic ---------
                if (attr.referenceEntitySetting?.relationType?.startsWith("mapping_") && rowData[key] != null) {
  const isMany = attr.referenceEntitySetting.relationType === "mapping_many_to_one";

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
      console.log('attr.referenceEntitySetting.refEntityId',attr.referenceEntitySetting.refEntityId,subKey);
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
      attr,
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
          console.log('attr',attr);
          // --------- Mapping attributes logic ---------
                if (attr.referenceEntitySetting?.relationType?.startsWith("mapping_") && rowData[key] != null) {
  const isMany = attr.referenceEntitySetting.relationType === "mapping_many_to_one";

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
          console.log('doc.rowData.${topLevelAttribute}_resolved._id',`doc.rowData.${topLevelAttribute}_resolved`);
          // Find the document(s) where display field matches parent _id
          const resolvedObj = doc.rowData[`${topLevelAttribute}_resolved`];
          if (!resolvedObj) continue;

          const parentId = resolvedObj._id; // this is the ObjectId you want

          const relatedDocs: any[] = await RefModel.find({ [`rowData.${displayField}`]: parentId }).lean();
          console.log('relatedDocs',relatedDocs);
     for (const doc of relatedDocs) {
    if (!doc?.rowData) continue;

    rowIds.push(doc._id);

    // Collect subValues for each subKey
    for (const subKey in doc.rowData) {
      if (subKey === displayField) continue;
      console.log('attr.referenceEntitySetting.refEntityId',attr.referenceEntitySetting.refEntityId,subKey);
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
      attr,
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
    const countPipeline = aggregationPipeline.filter((stage) => !('$skip' in stage || '$limit' in stage || '$project' in stage));
    countPipeline.push({ $count: 'totalCount' });
    const countResult = await DataSourceVersionValue.aggregate(countPipeline).exec();
    const totalCount = countResult?.[0]?.totalCount || 0;

    return { data: transformedData, totalCount };

  } catch (err) {
    throw err;
  }
};



export const getDataSourceVersionValueV2 = async ({
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
          $replaceRoot: { newRoot: { data: '$data', total: '$total' } },
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

    // Step 5: Execute
    const versionValueData = await DataSourceVersionValue.aggregate(aggregationPipeline).exec();

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
