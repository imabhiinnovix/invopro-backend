/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { getAttributeByName, getEntityAttribute, getModelForEntity } from '../../../utils/entity.utils';
import createDefaultImportLogCentralFileModel from '../../models/common/defaultImportLogCentralFileModel';
import { Model, Document, AnyBulkWriteOperation } from 'mongoose';
import { findEntityById } from './entity.services';

/**
 * ✅ UPSERT VALIDATED CENTRAL FILE DATA (UNIQUE LOGIC)
 */
export const updateCentralFileImportLog = async (
  schemaName: string,
  data: any[],
  uniqueKeys: string[][] = []
) => {
  const Model = createDefaultImportLogCentralFileModel(schemaName) as Model<Document>;

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
    const Model = createDefaultImportLogCentralFileModel(schemaName);
    const emptyDoc = new Model({});
    await emptyDoc.save();
  } catch (err) {
    throw err;
  }
};

/**
 * ✅ INSERT IMPORT LOG DATA (NO UPSERT)
 */
export const createCentralFileImportLog = async (schemaName: string, data: any[]) => {
  try {
    const Model = createDefaultImportLogCentralFileModel(schemaName);
    return await Model.insertMany(data);
  } catch (err) {
    throw err;
  }
};

/**
 * ✅ GET CENTRAL FILE IMPORT LOG DATA (PAGINATED)
 */
export const getCentralFileImportLog = async ({
  schemaName,
  query,
  select = '',
  page = 1,
  limit = 50,
  sort = { updatedAt: 1 },
}: any) => {
  try {
    const Model = createDefaultImportLogCentralFileModel(schemaName);

    const pipeline: any[] = [
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
      pipeline.push({ $project: projectionFields });
    }

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
export const getCentralFileImportLogCount = async (schemaName: string, query: Record<string, any>) => {
  try {
    const Model = createDefaultImportLogCentralFileModel(schemaName);
    return await Model.countDocuments(query);
  } catch (err) {
    throw err;
  }
};

/**
 * ✅ UPDATE IMPORT LOG RECORDS
 */
export const updateCentralFileImportLogRecords = async (
  schemaName: string,
  query: Record<string, any>,
  updateFields: Record<string, any>,
  incFields: Record<string, number> = {}
) => {
  try {
    const Model = createDefaultImportLogCentralFileModel(schemaName);

    return await Model.updateMany(query, {
      ...(Object.keys(updateFields).length > 0 && { $set: updateFields }),
      ...(Object.keys(incFields).length > 0 && { $inc: incFields }),
    });
  } catch (err) {
    throw err;
  }
};

/**
 * ✅ GET RAW IMPORT LOG DATA (NO _id)
 */
export const getCentralFileImportLogRaw = async (schemaName: string, query: Record<string, any>) => {
  try {
    const Model = createDefaultImportLogCentralFileModel(schemaName);
    return await Model.aggregate([{ $match: query }, { $project: { _id: 0 } }]);
  } catch (err) {
    throw err;
  }
};

/**
 * ✅ GET IMPORT LOG WITH ENTITY REFERENCE RESOLUTION (🔥 MAIN FUNCTION)
 */
export const getCentralFileImportLogResolved = async (
  schemaName: string,
  query: Record<string, any>,
  entityDetails: any
) => {
  try {
    const Model = createDefaultImportLogCentralFileModel(schemaName);

    const pipeline: any[] = [{ $match: query }];

    if (!entityDetails?.attributes) return [];

    const attributesMap: Record<string, any> = {};
    const refAttributesMap: Record<string, any> = {};

    for (const attr of entityDetails.attributes) {
      attributesMap[attr.name] = attr;

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

    // 🔹 LOOKUPS
    for (const [attrName, attr] of Object.entries(attributesMap)) {
      if (attr.referenceEntitySetting?.refEntityId) {
        const refEntityId = attr.referenceEntitySetting.refEntityId;
        const localField = `rowData.${attrName}`;
        const asField = `rowData.${attrName}_resolved`;
        const refModel = await getModelForEntity(refEntityId);

        if (!pipeline.some((stage) => stage.$lookup?.as === asField)) {
          pipeline.push({
            $lookup: {
              from: refModel.collection.name,
              localField,
              foreignField: '_id',
              as: asField,
              pipeline: [{ $match: { status: 'active' } }],
            },
          });

          pipeline.push({
            $unwind: { path: `$${asField}`, preserveNullAndEmptyArrays: true },
          });
        }
      }
    }

    const data = await Model.aggregate(pipeline).exec();
    if (!data?.length) return [];

    async function resolveRefAttribute(attr: any, refResolved: any, key: string, rowData: Record<string, any>) {
      if (!refResolved) return;

      let displayField: string | undefined;
      if (attr.referenceEntitySetting?.refEntityField) {
        const refFieldAttr = await getEntityAttribute(
          attr.referenceEntitySetting.refEntityId,
          attr.referenceEntitySetting.refEntityField
        );
        displayField = refFieldAttr?.name;
      }

      if (refResolved && refResolved.rowData) {
        const refRowData = refResolved.rowData;
        for (const subKey in refRowData) rowData[`${key}.${subKey}`] = refRowData[subKey];
        rowData[key] =
          displayField && refRowData[displayField] !== undefined
            ? refRowData[displayField]
            : Object.values(refRowData)[0];
      }
    }

    const transformedData = await Promise.all(
      data.map(async (doc: any) => {
        const newDoc = { ...doc };
        const rowData: Record<string, any> = { ...doc.rowData };

        for (const key in attributesMap) {
          if (rowData.hasOwnProperty(`${key}_resolved`)) {
            const refResolved = rowData[`${key}_resolved`];
            await resolveRefAttribute(attributesMap[key], refResolved, key, rowData);
            delete rowData[`${key}_resolved`];
          }
        }

        newDoc.rowData = rowData;
        return newDoc;
      })
    );

    return transformedData;
  } catch (err) {
    console.error('Error in getCentralFileImportLogResolved:', err);
    throw err;
  }
};

/**
 * ✅ DELETE CENTRAL FILE IMPORT LOG DATA
 */
export const deleteCentralFileImportLog = async (schemaName: string, query: Record<string, any>) => {
  try {
    const Model: any = createDefaultImportLogCentralFileModel(schemaName);
    return await Model.deleteMany(query);
  } catch (err) {
    throw err;
  }
};