/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Types } from 'mongoose';
import path from 'path';
import fs from 'fs/promises';
import { findCentralFileById, updateCentralFileById } from '../database/services/common/centralFile.service';
import { readExcelFile } from './excel.utils';
import { findDataSourceById } from '../database/services/common/dataSource.services';
import { validateFileData, validateFileDataCondition } from './validateFileData.utils';
import { autoPopulateAttributeOption } from './attributeOption.utils';
import { getImportLogCentralFileSchemaNameBasedOnVersionCodeAndOrgCode, getImportLogSchemaNameBasedOnVersionCodeAndOrgCode } from './common.utils';
import * as importLogCentralFileService from '../database/services/common/defaultImportLogCentralFile.service';
import * as dataImportErrorServices from '../database/services/common/dataImportCentralFileError.service';


export function normalize(name: string) {
  return name
    .split('.')[0]
    .replace(/\s+/g, '')
    .toLowerCase();
}


export async function resolveDataSourceId({
  originalFileName,
  dataSourceId,
  customReportData,
  allJsonMapping,
  allJsonSeparator,
}: {
  originalFileName: string;
  dataSourceId?: string;
  customReportData?: any;
  allJsonMapping?: Record<string, any>;
  allJsonSeparator?: Record<string, any>;
}): Promise<{
  dataSourceId: string | null;
  entityId: string | null;
  mapping: Record<string, any> | null;
  separator: Record<string, any> | null;
}> {

  // ✅ Case 1: datasourceId explicitly provided
  if (dataSourceId) {
    const dataSourceDetails: any = await findDataSourceById(dataSourceId, true);
     if (dataSourceDetails && dataSourceDetails.entityId) {
      return {
        dataSourceId,
        entityId: dataSourceDetails?.entityId,
        mapping: allJsonMapping || null,
        separator: allJsonSeparator || null,
      };
    }
  }

  // ✅ Case 2: no report mapping
  if (!customReportData?.dataSourceIds?.length) {
    return {
      dataSourceId: null,
      entityId: null,
      mapping: null,
      separator: null,
    };
  }

  const normalizedFileName = normalize(originalFileName);

  // ✅ Case 3: derive from report mapping
  for (const dsInfo of customReportData.dataSourceIds) {
    const fileDetails = dsInfo.fileDetails || [];

    for (const fd of fileDetails) {
      const fileDetailName = fd.name;
      const sheetName = fd.sheetName;

      const mappingName = sheetName
        ? `${fileDetailName}__${sheetName}`
        : fileDetailName;

      const normalizedDetailName = normalize(fileDetailName);
      const normalizedMappingName = normalize(mappingName);

      if (
        normalizedFileName === normalizedDetailName ||
        normalizedFileName === normalizedMappingName ||
        normalizedFileName.includes(normalizedDetailName)
      ) {
        const mapping = allJsonMapping?.[mappingName] || null;
        const separator = allJsonSeparator?.[fileDetailName] || null;

        return {
          dataSourceId: dsInfo.dataSourceId?.toString() || null,
          entityId: dsInfo.entityId?.toString() || null,
          mapping,
          separator,
        };
      }
    }
  }

  return {
    dataSourceId: null,
    entityId: null,
    mapping: null,
    separator: null,
  };
}


export async function moveCentralFileToMisc({
  centralFile,
  organizationId,
}: {
  centralFile: any;
  organizationId: string;
}) {
  const miscPath = path.join(
    'uploads',
    organizationId,
    'central-files',
    'MISC'
  );

  await fs.mkdir(miscPath, { recursive: true });

  const fileName = path.basename(centralFile.filePath);
  const targetPath = path.join(miscPath, fileName);

  await fs.rename(centralFile.filePath, targetPath);

  await updateCentralFileById(centralFile._id, {
    filePath: targetPath,
    validationStatus: 'failed',
  });
}

export async function validateCentralFileForDataSource({
  organizationId,
  userId,
  orgCode,
  centralFileId,
  versionValue,
}: any) {

  const BATCH_SIZE = 5000;

  // 1️⃣ Load central file
  const centralFile: any = await findCentralFileById(centralFileId);
  if (!centralFile) throw new Error('Central file not found');

  if (!centralFile.dataSourceId) {
    return {
      status: 'skipped',
      reason: 'Datasource not assigned',
    };
  }

  const finalDataSourceId = centralFile.dataSourceId;

  // 2️⃣ Load datasource
  const dataSourceDetails: any = await findDataSourceById(finalDataSourceId, true);
  if (!dataSourceDetails?.entityId) {
    throw new Error('Datasource entity not found');
  }

  const entityDetails = dataSourceDetails.entityId;
  let attributes = entityDetails.attributes || [];

  const filePath = centralFile.filePath;
  const mappings = centralFile.mapping || {};
  const separator = centralFile.separator || {};

  // 3️⃣ Read file
  const fileData = await readExcelFile(filePath);

  const fileDataWithRowNumber = fileData.map((row, index) => ({
    ...row,
    fileRowNumber: `${centralFile.storedFileName}:${index + 2}`,
  }));

  // 4️⃣ Apply conditions
  const filteredData = await validateFileDataCondition({
    fileData: fileDataWithRowNumber,
    attributeSetting: attributes,
    conditions: dataSourceDetails.condition,
    jsonMapping: mappings,
  });

  // 5️⃣ Auto populate attribute options
  attributes = await autoPopulateAttributeOption({
    fileData: filteredData,
    entityId: entityDetails._id,
    attributesDetails: attributes,
    attributMapping: mappings,
    userId,
    organizationId,
  });

  // 6️⃣ Validate data (IMPORTANT CHANGE ❗)
  const validatedData = await validateFileData({
    fileData: filteredData,
    attributes,
    versionValue,
    mapping: mappings,
    separator,
    dataSourceId: finalDataSourceId,
    entityId: entityDetails._id,

    // ✅ central file instead of dataSourceVersionId
    centralFileId,

    uniqueAttributeRules: dataSourceDetails.uniqueAttributeRules,
  });

  const { newRowData, errors } = validatedData;

  // 7️⃣ Resolve ImportLog schema
  const importLogSchema = getImportLogCentralFileSchemaNameBasedOnVersionCodeAndOrgCode({
    orgCode,
    versionCode: dataSourceDetails.code,
  });

  // ================================
  // ✅ PUSH VALID DATA INTO IMPORT LOG
  // ================================
  if (newRowData?.length) {
    const rowsWithMeta = newRowData.map(row => ({
      ...row,
      createdBy: userId
    }));

    for (let i = 0; i < rowsWithMeta.length; i += BATCH_SIZE) {
      await importLogCentralFileService.createCentralFileImportLog(
        importLogSchema,
        rowsWithMeta.slice(i, i + BATCH_SIZE)
      );
    }
  }

  // ================================
  // ✅ PUSH ERRORS INTO IMPORT ERROR
  // ================================
  if (errors?.length) {

    for (let i = 0; i < errors.length; i += BATCH_SIZE) {
      await dataImportErrorServices.createManyDataImportCentralFileError(
        errors.slice(i, i + BATCH_SIZE)
      );
    }

    await updateCentralFileById(centralFileId, {
      validationStatus: 'failed',
    });

    return { status: 'failed' };
  }

  // ✅ Mark validated
  await updateCentralFileById(centralFileId, {
    validationStatus: 'validated',
  });

  return { status: 'validated' };
}

