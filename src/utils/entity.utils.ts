import { Types, Model, Document } from 'mongoose';
import { getSchemaNameBasedOnVersionCodeAndOrgCode } from './common.utils';
import createDefaultDataSourceVersionModel from '../database/models/defaultImportLogDataSourceVersionModel';
import { getDataSourcePopulate } from '../database/services/reportivix/dataSource.services';
import { findEntityById } from '../database/services/reportivix/entity.services';

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
