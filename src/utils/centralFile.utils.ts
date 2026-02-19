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
import { getCentralFileSchemaNameBasedOnVersionCodeAndOrgCode, getImportLogCentralFileSchemaNameBasedOnVersionCodeAndOrgCode, getImportLogSchemaNameBasedOnVersionCodeAndOrgCode } from './common.utils';
import * as importLogCentralFileService from '../database/services/common/defaultImportLogCentralFile.service';
import * as dataImportErrorServices from '../database/services/common/dataImportCentralFileError.service';
import * as centralFileValueService from '../database/services/common/defaultCentralFileValue.service';
import XLSX from 'xlsx';

interface WriteValidatedExcelParams {
  basePath: string;
  originalFileName: string;
  mapping: Record<string, any>;
  rowsWithMeta: any[];
  sheetName?:string | null;
}

export async function writeValidatedCentralFileExcel({
  basePath,
  originalFileName,
  mapping,
  rowsWithMeta,
  sheetName
}: WriteValidatedExcelParams) {

  const validatedDir = path.join(basePath, 'validated');
  await fs.mkdir(validatedDir, { recursive: true });

  const validatedFilePath = path.join(validatedDir, originalFileName);

  // --------------------------------------
  // 1️⃣ Build Reverse Mapping
  // --------------------------------------

  const reverseMapping: Record<string, string> = {};

  Object.entries(mapping || {}).forEach(([entityAttr, fileColumn]) => {

    if (fileColumn === 'Extra-Attribute-Ignore') return;

    if (Array.isArray(fileColumn)) {
      fileColumn.forEach(col => {
        if (col !== 'Extra-Attribute-Ignore') {
          reverseMapping[col] = entityAttr;
        }
      });
    } else {
      reverseMapping[fileColumn] = entityAttr;
    }
  });

  // --------------------------------------
  // 2️⃣ Prepare Excel Data
  // --------------------------------------

  const excelData = rowsWithMeta.map(row => {
    const formattedRow: Record<string, any> = {};

    Object.keys(reverseMapping).forEach(fileHeader => {
      const entityAttr = reverseMapping[fileHeader];

      let value = row.rowData?.[entityAttr];

      if (Array.isArray(value)) {
        value = value.length > 0 ? value[0] : '';
      }

      formattedRow[fileHeader] = value ?? '';
    });

    return formattedRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // --------------------------------------
  // 3️⃣ File Exists Logic
  // --------------------------------------

  let workbook: XLSX.WorkBook;

  const fileExists = await fs
    .access(validatedFilePath)
    .then(() => true)
    .catch(() => false);

  if (fileExists) {

    // Read existing workbook
    workbook = XLSX.readFile(validatedFilePath);

    // ✅ If sheetName provided → update/append logic
    if (sheetName && sheetName.trim() !== '') {

      const targetSheet = sheetName.trim();

      // If sheet exists → replace it
      if (workbook.SheetNames.includes(targetSheet)) {
        workbook.Sheets[targetSheet] = worksheet;
      } else {
        // If sheet does not exist → append new sheet
        XLSX.utils.book_append_sheet(workbook, worksheet, targetSheet);
      }

    } else {
      // ❗ No sheetName → overwrite entire file (existing behavior)
      workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'ValidatedData');
    }

  } else {
    // File does not exist → create new
    workbook = XLSX.utils.book_new();

    const finalSheetName =
      sheetName && sheetName.trim() !== ''
        ? sheetName.trim()
        : 'ValidatedData';

    XLSX.utils.book_append_sheet(workbook, worksheet, finalSheetName);
  }

  // --------------------------------------
  // 4️⃣ Write File
  // --------------------------------------

  XLSX.writeFile(workbook, validatedFilePath);

  return validatedFilePath;
}


export function normalize(name: string) {
  return name
    .split('.')[0]
    .replace(/\s+/g, '')
    .toLowerCase();
}


export async function resolveDataSourceId({
  originalFileName,
  sheetName, // ✅ NEW
  dataSourceId,
  customReportData,
  allJsonMapping,
  allJsonSeparator,
}: {
  originalFileName: string;
  sheetName?: string | null; // ✅ NEW
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

  // ===============================
  // ✅ Case 1: datasourceId provided explicitly
  // ===============================
  if (dataSourceId) {
    const dataSourceDetails: any = await findDataSourceById(dataSourceId, true);

    if (dataSourceDetails?.entityId) {
      return {
        dataSourceId,
        entityId: dataSourceDetails.entityId,
        mapping: allJsonMapping || null,
        separator: allJsonSeparator || null,
      };
    }
  }

  // ===============================
  // ✅ Case 2: no report mapping
  // ===============================
  if (!customReportData?.dataSourceIds?.length) {
    return {
      dataSourceId: null,
      entityId: null,
      mapping: null,
      separator: null,
    };
  }

  const normalizedFileName = normalize(originalFileName);
  const normalizedSheetName = sheetName ? normalize(sheetName) : null;

  // ===============================
  // ✅ Case 3: derive from report mapping (FILE + SHEET MATCH)
  // ===============================
  for (const dsInfo of customReportData.dataSourceIds) {

    const fileDetails = dsInfo.fileDetails || [];

    for (const fd of fileDetails) {

      const fileDetailName = fd.name;
      const reportSheetName = fd.sheetName || null;

      const normalizedDetailName = normalize(fileDetailName);
      const normalizedReportSheetName = reportSheetName
        ? normalize(reportSheetName)
        : null;

      const isFileMatch =
        normalizedFileName === normalizedDetailName;

      const isSheetMatch =
        !reportSheetName || // if report doesn't require sheet
        !sheetName ||       // if sheet not provided
        normalizedSheetName === normalizedReportSheetName;

      if (isFileMatch && isSheetMatch) {

        // Mapping key should be file__sheet if sheet exists
        const mappingKey = reportSheetName
          ? `${fileDetailName}__${reportSheetName}`
          : fileDetailName;

        const mapping = allJsonMapping?.[mappingKey] || null;

        // separator is generally file-based
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

  // ===============================
  // ❌ No match found
  // ===============================
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
  basePath
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

  if (errors?.length) {
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

    for (let i = 0; i < errors.length; i += BATCH_SIZE) {
      await dataImportErrorServices.createManyDataImportCentralFileError(
        errors.slice(i, i + BATCH_SIZE)
      );
    }

    await updateCentralFileById(centralFileId, {
      validationStatus: 'error',
    });

    return { status: 'error' };
  }else{
   // ======================================
  // ✅ INSERT VALID DATA + STORE EXCEL
  // ======================================

  const mainTableSchemaName =
    getCentralFileSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: dataSourceDetails.code,
    });

  const BATCH_SIZE = 1000; // Adjust if needed

  if (newRowData?.length) {
    // --------------------------------------
    // ✅ 1. Add metadata
    // --------------------------------------
    const rowsWithMeta = newRowData.map((row: any) => ({
      ...row,
      createdBy: userId,
    }));

    // --------------------------------------
    // ✅ 2. Batch Insert Into Central File Value
    // --------------------------------------
    for (let i = 0; i < rowsWithMeta.length; i += BATCH_SIZE) {
      await centralFileValueService.createCentralFileValue(
        mainTableSchemaName,
        rowsWithMeta.slice(i, i + BATCH_SIZE)
      );
    }

    // --------------------------------------
    // ✅ 3. Write Validated Excel File
    // --------------------------------------
    await writeValidatedCentralFileExcel({
                                          basePath,
                                          originalFileName: centralFile.originalFileName,
                                          mapping: mappings,
                                          rowsWithMeta,
                                          sheetName: centralFile?.sheetName
                                        });

  }

  // --------------------------------------
  // ✅ 4. Mark File as Validated
  // --------------------------------------
  await updateCentralFileById(centralFileId, {
    validationStatus: 'validated',
  });

  return { status: 'validated' };


  }
}

