import { Types, Model, Document } from 'mongoose';
import { getSchemaNameBasedOnVersionCodeAndOrgCode } from './common.utils';
import createDefaultDataSourceVersionModel from '../database/models/defaultImportLogDataSourceVersionModel';
import { getDataSourcePopulate } from '../database/services/common/dataSource.services';
import { findEntityById } from '../database/services/common/entity.services';

const modelCache = new Map<string, Model<Document>>();
/**
 * Get model for a given entityId by resolving DataSource and creating the DataSource-based model.
 * @param entityId Mongo ObjectId of the Entity
 * @returns Mongoose Model instance for the collection derived from DataSource's code and organization
 */
export async function getModelForEntity(entityId: string) {
  const idStr = new Types.ObjectId(entityId).toHexString();

  if (modelCache.has(idStr)) {
    return modelCache.get(idStr)!;
  }

  const dataSource = await getDataSourcePopulate({ entityId }, [
    {
      path: 'organizationId',
      select: 'name code', // Specify the fields to populate
    },
  ]);
  if (!dataSource || !dataSource.entityId) {
    throw new Error(`No DataSource found for entityId ${entityId}`);
  }
  console.log('dataSource', dataSource);
  const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
    orgCode: dataSource.organizationId.code,
    versionCode: dataSource.code,
  });

  const model = createDefaultDataSourceVersionModel(schemaName) as Model<Document>;
  modelCache.set(idStr, model);

  return model;
}

export async function getEntityAttribute(entityId: string, attributeId: string) {
  const refEntity: any = await findEntityById(entityId);
  const attribute = refEntity?.attributes?.find((attr) => attr._id.toString() === attributeId.toString());
  return attribute;
}

export async function resolveFieldPath(cond: any, entityAttributes: any[]): Promise<string> {
  const attrMapById = Object.fromEntries(
    entityAttributes.map(attr => [attr._id.toString(), attr])
  );

  const mainAttr = attrMapById[cond.fieldId?.toString()];
  if (!mainAttr) return '';

  // Handle reference field logic
  if (mainAttr.referenceEntitySetting?.refEntityId && cond.refFieldId) {
    const refEntityId = mainAttr.referenceEntitySetting.refEntityId;

    const refEntity: any = await findEntityById(refEntityId);
    if (!refEntity || !Array.isArray(refEntity.attributes)) return '';

    const refAttrMap: Record<string, any> = refEntity.attributes.reduce((acc, attr) => {
      acc[attr._id.toString()] = attr;
      return acc;
    }, {} as Record<string, any>);

    const refAttr = refAttrMap[cond.refFieldId?.toString()];
    if (!refAttr) return '';

    // Use _resolved path for reference fields
    return `rowData.${mainAttr.name}_resolved.rowData.${refAttr.name}`;
  }

  // For non-reference fields
  return `rowData.${mainAttr.name}`;
}


