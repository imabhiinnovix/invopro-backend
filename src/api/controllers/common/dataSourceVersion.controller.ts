/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { promises as fsPromises } from 'fs';
import * as dataSourceVersionService from '../../../database/services/common/dataSourceVersion.services';
import * as dataSourceVersionValueService from '../../../database/services/common/defaultDataSourceVersionValue.services';
import * as importLogDataSourceVersionValueService from '../../../database/services/common/defaultImportLogDataSourceVersionValue.services';
import * as dataSourceService from '../../../database/services/common/dataSource.services';
import * as attributeOptionService from '../../../database/services/common/attributeOption.services';
import * as dataImportErrorServices from '../../../database/services/common/dataImportError.services';
import {
  createMongoCondition,
  escapeRegExp,
  formatDateTime,
  getCentralFileSchemaNameBasedOnVersionCodeAndOrgCode,
  getConversionRate,
  getImportLogSchemaNameBasedOnVersionCodeAndOrgCode,
  getSchemaNameBasedOnVersionCodeAndOrgCode,
  normalizeValue,
  sleep,
} from '../../../utils/common.utils';
import path from 'path';
import { excelDateToJSDate, readExcelFile } from '../../../utils/excel.utils';
import { debounceManager } from '../../../utils/debounce.utils';
import { DateTime } from 'luxon';
import mongoose from 'mongoose';
import { getEntityAttribute, getModelForEntity } from '../../../utils/entity.utils';
import { Types } from 'mongoose';
import { findEntityById } from '../../../database/services/common/entity.services';
import { autoPopulateAttributeOption, autoPopulateAttributeOptionFromRow } from '../../../utils/attributeOption.utils';
import * as entityService from '../../../database/services/common/entity.services';
import { findDerivedFieldById } from '../../../database/services/common/derivedField.services';
import { getUserDataPermissionRecord } from '../../../database/services/common/userDataPermission.service';
import ExcelJS from 'exceljs';
import { createDownloadRequest } from '../../../database/services/common/downloadRequest.service';
import { Queue } from 'bullmq';
import { findCentralFiles, findLatestCentralFile, getLatestCentralMappingAndSeparator } from '../../../database/services/common/centralFile.service';
import { getCentralFileValue } from '../../../database/services/common/defaultCentralFileValue.service';
import { autoSyncReferenceRow } from '../../../utils/attributeAutoGenerate.utils';

const ObjectId = mongoose.Types.ObjectId;

export const ERROR_CODES = {
  MANDATORY_MISSING: {
    code: '1001',
    type: 'Mandatory Error',
    message: 'Required attribute is missing.',
  },
  INVALID_TYPE: {
    code: '1002',
    type: 'Type Error',
    message: 'Invalid data type provided.',
  },
  INVALID_REFERENCE: {
    code: '1003',
    type: 'Reference Error',
    message: 'Referenced value not found in reference entity.',
  },
  INVALID_OPTION: {
    code: '1004',
    type: 'Option Error',
    message: 'Provided value is not among the allowed options.',
  },
  DUPLICATE_ENTRY: {
    code: '1005',
    type: 'Duplicate Error',
    message: 'Duplicate combination of unique keys found.',
  },
  DUPLICATE_REFERENCE: {
    code: '1006',
    type: 'Duplicate Reference Error',
    message: 'Duplicate Referenced value found in reference entity.',
  },
};

function evaluateCondition(fieldValue: any, operator: string, expectedValue: any, fieldType: string): boolean {
  if (fieldValue === undefined || fieldValue === null) {
    if (operator === 'blank') return true;
    if (operator === 'notblank') return false;
    fieldValue = '';
  }

  switch (fieldType) {
    case 'number':
      fieldValue = parseFloat(fieldValue);
      expectedValue = parseFloat(expectedValue);
      switch (operator) {
        case 'lt':
          return fieldValue < expectedValue;
        case 'lte':
          return fieldValue <= expectedValue;
        case 'gt':
          return fieldValue > expectedValue;
        case 'gte':
          return fieldValue >= expectedValue;
        case 'eq':
          return fieldValue === expectedValue;
        case 'ne':
          return fieldValue !== expectedValue;
        case 'blank':
          return isNaN(fieldValue);
        case 'notblank':
          return !isNaN(fieldValue);
      }
      break;

    case 'date':
    case 'date-range':
      const dateValue = new Date(fieldValue);
      const dateExpected = new Date(expectedValue);
      switch (operator) {
        case 'before':
          return dateValue < dateExpected;
        case 'after':
          return dateValue > dateExpected;
        case 'on':
          return dateValue.toDateString() === dateExpected.toDateString();
        case 'noton':
          return dateValue.toDateString() !== dateExpected.toDateString();
        case 'blank':
          return isNaN(dateValue.getTime());
        case 'notblank':
          return !isNaN(dateValue.getTime());
      }
      break;

    case 'boolean':
      fieldValue = fieldValue === 'true' || fieldValue === true;
      expectedValue = expectedValue === 'true' || expectedValue === true;
      switch (operator) {
        case 'eq':
          return fieldValue === expectedValue;
        case 'ne':
          return fieldValue !== expectedValue;
        case 'blank':
          return fieldValue === null || fieldValue === undefined;
        case 'notblank':
          return fieldValue !== null && fieldValue !== undefined;
      }
      break;

    case 'text':
    case 'richtext':
    case 'url':
    case 'option':
    case 'multioption':
    case 'user':
    default:
      const stringVal = String(fieldValue).toLowerCase();
      const expected = String(expectedValue).toLowerCase();
      switch (operator) {
        case 'contains':
          return stringVal.includes(expected);
        case 'notcontains':
          return !stringVal.includes(expected);
        case 'eq':
          return stringVal === expected;
        case 'ne':
          return stringVal !== expected;
        case 'startswith':
          return stringVal.startsWith(expected);
        case 'endswith':
          return stringVal.endsWith(expected);
        case 'blank':
          return stringVal.trim() === '';
        case 'notblank':
          return stringVal.trim() !== '';
      }
  }

  return false;
}

export async function validateFileDataCondition({ fileData, attributeSetting, conditions, jsonMapping }) {
  if (!conditions || conditions.length === 0) return fileData;

  const filteredData: Record<string, any>[] = [];

  for (const row of fileData) {
    let allConditionsMet = true;
    let hasUnresolved = false; // internal only

    for (const condition of conditions) {
      const baseField = condition.field.split('.')[0];
      const mappedField = jsonMapping[baseField];

      // Resolve fieldValue based on whether mapping is a string or array
      let fieldValue: any;
      if (Array.isArray(mappedField)) {
        for (const key of mappedField) {
          const candidate = row[key];
          if (candidate !== undefined && candidate !== null && candidate !== '') {
            fieldValue = candidate;
            break;
          }
        }
      } else {
        fieldValue = row[mappedField];
      }

      // If missing → mark unresolved and skip this condition
      if (!fieldValue) {
        continue;
      }

      // Find the attribute setting for this condition.field
      const attr = attributeSetting?.find((a) => a.name === baseField);

      // Check for reference resolution
      if (
        attr?.referenceEntitySetting?.refEntityId &&
        attr?.referenceEntitySetting?.refEntityField &&
        ['one_to_one', 'many_to_one'].includes(attr.referenceEntitySetting?.relationType)
      ) {
        const refEntityId: string = attr.referenceEntitySetting.refEntityId;
        const refEntityFieldId = attr.referenceEntitySetting.refEntityField;
        const refMatchStrategy = attr.referenceEntitySetting.matchStrategy;

        // const refEntityField = await getEntityAttribute(refEntityId, refEntityFieldId);
        // const RefModel = await getModelForEntity(refEntityId);
        const { field: refEntityField, model: RefModel } = await getRefMeta(refEntityId, refEntityFieldId);

        // const escapedValue = escapeRegExp(fieldValue.trim());
        // const regex = new RegExp(`^${escapedValue}$`, 'i');

        // const referencedDoc: any = await RefModel.findOne({
        //   [`rowData.${refEntityField.name}`]: regex,
        //   'status': 'active'
        // });

        const referencedDoc = await resolveReference(
                            refEntityId,
                            // refEntityFieldId,
                            fieldValue,
                            refEntityField,
                            refMatchStrategy,
                            RefModel
                          );


        if (referencedDoc) {
          const subField = condition.field.split('.')[1];
          fieldValue = referencedDoc?.rowData?.[subField];
        } else {
          hasUnresolved = true;
          continue;
        }
      }

      // Run condition only if value resolved
      const result = evaluateCondition(fieldValue, condition.operator, condition.value, condition.fieldType);
      if (!result) {
        allConditionsMet = false;
        break;
      }
    }

    // Keep row if:
    //  - All conditions are met, OR
    //  - Some unresolved conditions exist
    if (allConditionsMet || hasUnresolved) {
      filteredData.push(row);
    }
  }

  return filteredData;
}

async function validateAndConvert({
  value,
  type,
  optionAttributeId,
  separator = ',',
}: {
  value: any;
  type: string;
  optionAttributeId?: string;
  separator?: string;
}) {
  if (type === 'number') {
    let convertedValue = parseFloat(value);
    if (typeof value === 'string' && value.toLowerCase().trim() === 'yes') {
      convertedValue = 1;
    } else if (typeof value === 'string' && value.toLowerCase().trim() === 'no') {
      convertedValue = 0;
    }
    return {
      isValid: !isNaN(convertedValue),
      convertedValue: !isNaN(convertedValue) ? convertedValue : null,
    };
  }

  if (type === 'text' || type === 'richtext') {
    const convertedValue = value !== undefined && value !== null ? String(value).trim() : null;
    return { isValid: typeof convertedValue === 'string', convertedValue };
  }

  if (type === 'date' || type === 'date-range') {
    if (typeof value === 'number') {
      value = excelDateToJSDate(value);
    }
    const convertedValue = new Date(value);
    return {
      isValid: !isNaN(convertedValue.getTime()),
      convertedValue: !isNaN(convertedValue.getTime()) ? convertedValue : null,
    };
  }

  if (type === 'boolean') {
    const convertedValue =
      value === 'true' || value === true ? true : value === 'false' || value === false ? false : null;
    return { isValid: typeof convertedValue === 'boolean', convertedValue };
  }

  if (type === 'url') {
    const urlRegex =
      /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/;
    const isValid = urlRegex.test(value);
    return { isValid, convertedValue: isValid ? value : null };
  }

  if (type === 'email') {
    const emailRegex =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const isValid = emailRegex.test(value);
    return { isValid, convertedValue: isValid ? value : null };
  }

  if (type === 'option' || type === 'multioption') {
  if (optionAttributeId) {
    // const attributeOptionDetails = await attributeOptionService.findAttributeOptionById(optionAttributeId);

    // const attributeOptionValue: string[] = attributeOptionDetails?.attributeValue || [];

    const attributeOptionValue = await getOptionSet(optionAttributeId);


    // normalize available options to lowercase
    const optionSet = new Set(attributeOptionValue.map((v) => v.trim().toLowerCase()));

    if (type === 'option') {
      const candidate = String(value).trim();
      const isValid = optionSet.has(candidate.toLowerCase());
      return {
        isValid,
        convertedValue: isValid ? candidate : null,
        attributeOptionValue,
      };
    } else {
      // handle multioption
      let valuesArray: string[] = [];

      if (Array.isArray(value)) {
        valuesArray = value.map((v) => String(v).trim()).filter(Boolean);
      } else if (typeof value === 'string') {
        const trimmed = value.trim();

        // ✅ Step 1: try full match (handles options with commas)
        if (optionSet.has(trimmed.toLowerCase())) {
          valuesArray = [trimmed];
        } else {
          // ✅ Step 2: fallback to split by comma
          valuesArray = trimmed
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean);
        }
      }

      const allValid = valuesArray.every((val) => optionSet.has(val.toLowerCase()));

      return {
        isValid: allValid,
        convertedValue: allValid ? valuesArray : null,
        attributeOptionValue,
      };
    }
  } else {
    return {
      isValid: false,
      convertedValue: null,
    };
  }
}


  return { isValid: true, convertedValue: value };
}

async function validateFileData({
  fileData,
  attributes,
  mapping,
  separator,
  dataSourceId,
  entityId,
  dataSourceVersionId,
  versionValue,
  uniqueAttributeRules = [],
  user
}: {
  fileData: any[];
  attributes: any[];
  mapping: Record<string, string>;
  separator: Record<string, string>;
  dataSourceId: string;
  entityId: any;
  dataSourceVersionId: string;
  versionValue: string;
  uniqueAttributeRules?: Types.ObjectId[][];
  user: any;
}) {
  const errors: any[] = [];
  const newRowData: any[] = [];
  const seenCompositeKeys = new Set<string>();


  // Create a quick lookup map from ObjectId to attribute name
  const attributeIdToNameMap = attributes.reduce(
    (acc, attr) => {
      acc[attr._id.toString()] = attr.name;
      return acc;
    },
    {} as Record<string, string>
  );

  const refCache = new Map<
    string,
    {
      _id: any;
      rowData: Record<string, any>;
      refSchemaName: string;
    }
  >();

  const rateCache = new Map<string, number>();

  const currencyConfig = {
    baseCurrency: "USD",     // from datasource
    defaultRate: 83.25,      // fallback
  };

  for (const [index, row] of fileData.entries()) {
    console.log('Processing Index:', index);
    const parts = row.fileRowNumber.split(':');
    const rowNum = parts.pop(); // last part → row number
    const fileName = parts.join(':');
    const newRow = {
      dataSourceId,
      entityId,
      dataSourceVersionId,
      versionValue,
      rowData: {},
      isErrorLog: 0,
      rowNumber: index + 1,
    };

    // track temporary __display keys for cleanup later
    const tempDisplayAttrs: string[] = [];

    for (const attr of attributes) {
      const attrName = attr.name;
      const fileKey = mapping[attrName];
      let value: any;

      if (Array.isArray(fileKey)) {
        // Find the first value that is not null, undefined, or empty string
        for (const key of fileKey) {
          const candidate = row[key];
          if (candidate !== undefined && candidate !== null && candidate !== '') {
            value = candidate;
            break;
          }
        }
      } else {
        value = row[fileKey];
      }

      if (typeof value === 'object' && value != null) {
        value = value.text;
      }
      newRow.rowData[attrName] = value;

      // if normalization enabled
      if (attr.normalize === true) {
        newRow.rowData[`${attrName}_normalize`] = normalizeValue(value);
      }

      if (
        (attr.required === 'Mandatory' || attr.required === true) &&
        (value === undefined || value === null || value === '')
      ) {
        errors.push({
          entityId,
          dataSourceId,
          dataSourceVersionId,
          rowNumber: index + 1,
          fileAttributeName: Array.isArray(fileKey) ? fileKey.join('|') : fileKey,
          attributeName: attrName,
          attributeType: attr.type,
          attributeOptionId: attr.optionAttributeId ? attr.optionAttributeId : null,
          refAttributeId: attr._id,
          errorType: ERROR_CODES.MANDATORY_MISSING.type,
          errorCode: ERROR_CODES.MANDATORY_MISSING.code,
          status: 'open',
          fileRowNumber: rowNum,
          fileName,
          errorMessage: `The attribute "${attrName}" is required but is missing.`,
        });
        newRow.isErrorLog = newRow.isErrorLog ? newRow.isErrorLog + 1 : 1;
      } else if (value !== undefined && value != null && value) {
        if (
          attr.referenceEntitySetting?.refEntityId &&
          ['one_to_one', 'many_to_one'].includes(attr.referenceEntitySetting?.relationType)
        ) {
          const refEntityId = attr.referenceEntitySetting.refEntityId;
          const refEntityFieldId = attr.referenceEntitySetting.refEntityField;
          const refMatchStrategy = attr.referenceEntitySetting.matchStrategy;

          // const refEntityField = await getEntityAttribute(refEntityId, refEntityFieldId);
          // const RefModel = await getModelForEntity(refEntityId);
          const { field: refEntityField, model: RefModel } = await getRefMeta(refEntityId, refEntityFieldId);

          // const escapedValue = escapeRegExp(value.trim());
          // const regex = new RegExp(`^${escapedValue}$`, 'i');

          // const referencedDoc: any = await RefModel.findOne({
          //   [`rowData.${refEntityField.name}`]: regex,
          //   'status': 'active'
          // });
          const referencedDoc = await resolveReference(
                              refEntityId,
                              // refEntityFieldId,
                              value,
                              refEntityField,
                              refMatchStrategy,
                              RefModel
                            );

          const refDataSources = await dataSourceService.findDataSourcesByEntityId(refEntityId);
          const refDataSourceDetails = refDataSources?.[0] || {};
          console.log('referencedDoc',referencedDoc, refEntityId,refEntityField ,value);
          if (!referencedDoc) {
            if (refDataSourceDetails?.isReferenceAutoGenerate && refDataSourceDetails?.isReferenceAutoGenerate == true) {
              const newRefId = await autoSyncReferenceRow({
                refEntityId,
                refValue: value,
                refEntityField,
                row,
                mapping,
                user,
                refDataSourceDetails,
                refCache
              });

              newRow.rowData[attrName] = newRefId;
            }else{
              errors.push({
                entityId,
                dataSourceId,
                dataSourceVersionId,
                rowNumber: index + 1,
                fileAttributeName: Array.isArray(fileKey) ? fileKey.join('|') : fileKey,
                fileAttributeValue: value,
                attributeName: attrName,
                attributeType: attr.type,
                refEntityId,
                refAttributeId: refEntityFieldId,
                refDataSourceId: refDataSourceDetails?._id,
                errorType: ERROR_CODES.INVALID_REFERENCE.type,
                errorCode: ERROR_CODES.INVALID_REFERENCE.code,
                fileRowNumber: rowNum,
                fileName,
                status: 'open',
                errorMessage: `${attrName}- ${value} not found.`,
              });
              newRow.isErrorLog = newRow.isErrorLog ? newRow.isErrorLog + 1 : 1;
            }
          } else{
             if (refDataSourceDetails?.isReferenceAutoGenerate && refDataSourceDetails?.isReferenceAutoGenerate == true) {
              errors.push({
                  entityId,
                  dataSourceId,
                  dataSourceVersionId,
                  rowNumber: index + 1,
                  fileAttributeName: Array.isArray(fileKey) ? fileKey.join('|') : fileKey,
                  fileAttributeValue: value,
                  attributeName: attrName,
                  attributeType: attr.type,
                  refEntityId,
                  refAttributeId: refEntityFieldId,
                  refDataSourceId: refDataSourceDetails?._id,
                  errorType: ERROR_CODES.DUPLICATE_REFERENCE.type,
                  errorCode: ERROR_CODES.DUPLICATE_REFERENCE.code,
                  errorRowId: referencedDoc._id,
                  fileRowNumber: rowNum,
                  fileName,
                  status: 'open',
                  errorMessage: `${attrName}- ${value} already exists.`,
                });
                newRow.isErrorLog = newRow.isErrorLog ? newRow.isErrorLog + 1 : 1;
            }
            newRow.rowData[attrName] = referencedDoc._id;
            newRow.rowData[`${attrName}__display`] = referencedDoc.rowData?.[refEntityField.name];
            tempDisplayAttrs.push(`${attrName}__display`); // ✅ track for cleanup
          }
        } else {
          const { isValid, convertedValue, attributeOptionValue } = await validateAndConvert({
            value,
            type: attr.type,
            optionAttributeId: attr.optionAttributeId,
            separator: separator[value],
          });

          if (!isValid) {
            if (['option', 'multioption'].includes(attr.type)) {
              errors.push({
                entityId,
                dataSourceId,
                dataSourceVersionId,
                rowNumber: index + 1,
                fileAttributeName: Array.isArray(fileKey) ? fileKey.join('|') : fileKey,
                fileAttributeValue: value,
                attributeName: attrName,
                attributeType: attr.type,
                attributeOptionId: attr.optionAttributeId,
                refAttributeId: attr._id,
                errorType: ERROR_CODES.INVALID_OPTION.type,
                errorCode: ERROR_CODES.INVALID_OPTION.code,
                status: 'open',
                fileRowNumber: rowNum,
                fileName,
                errorMessage: `Invalid ${attrName} value ${value} must be one of the allowed options.`,
              });
            } else {
              errors.push({
                entityId,
                dataSourceId,
                dataSourceVersionId,
                rowNumber: index + 1,
                fileAttributeName: Array.isArray(fileKey) ? fileKey.join('|') : fileKey,
                fileAttributeValue: value,
                attributeName: attrName,
                attributeType: attr.type,
                status: 'open',
                refAttributeId: attr._id,
                errorType: ERROR_CODES.INVALID_TYPE.type,
                errorCode: ERROR_CODES.INVALID_TYPE.code,
                fileRowNumber: rowNum,
                fileName,
                errorMessage: `${attrName}- Invalid value ${value} for ${attr.type} type`,
              });
            }
            newRow.isErrorLog = newRow.isErrorLog ? newRow.isErrorLog + 1 : 1;
          } else {
            newRow.rowData[attrName] = convertedValue;
          }
        }
      }
    }

    // handle unique attribute validation
    if (Array.isArray(uniqueAttributeRules) && uniqueAttributeRules.length > 0) {
      for (const rule of uniqueAttributeRules) {
        const keyValues: string[] = [];
        const displayKeyValues: string[] = [];

        let isValidCombination = true;

        for (const attrId of rule) {
          const attrName = attributeIdToNameMap[attrId.toString()];
          if (!attrName) {
            isValidCombination = false;
            break;
          }

          const val = newRow.rowData[attrName];
          if (val === undefined || val === null || `${val}`.trim() === '') {
            isValidCombination = false;
            break;
          }

          keyValues.push(`${val}`.toLowerCase().trim());

          const displayKey = `${attrName}__display`;
          const displayValue = newRow.rowData[displayKey] ?? val;
          displayKeyValues.push(`${displayValue}`.trim());
        }

        if (isValidCombination) {
          const compositeKey = keyValues.join('|');
          const displayCompositeKey = displayKeyValues.join('|');

          if (seenCompositeKeys.has(compositeKey)) {
            errors.push({
              entityId,
              dataSourceId,
              dataSourceVersionId,
              rowNumber: index + 1,
              errorType: ERROR_CODES.DUPLICATE_ENTRY.type,
              errorCode: ERROR_CODES.DUPLICATE_ENTRY.code,
              fileAttributeValue: displayCompositeKey,
              fileRowNumber: rowNum,
              fileName,
              errorMessage: `Duplicate combination found for unique keys: ${displayCompositeKey}.`,
            });
            newRow.isErrorLog = 1;
          } else {
            seenCompositeKeys.add(compositeKey);
          }

          // apply only first valid rule, skip others
          break;
        }
      }
    }

    // ✅ cleanup temporary __display keys (always, not just for unique)
    for (const tempKey of tempDisplayAttrs) {
      delete newRow.rowData[tempKey];
    }

  const rowCurrency = typeof row["Currency"] === "string" && row["Currency"] ? row["Currency"].toUpperCase()?.trim() : "";

if (rowCurrency) {
  const to = currencyConfig.baseCurrency;
  const from = rowCurrency;

  let rate;

  // ✅ 1. SAME CURRENCY → no API, no cache
  if (from === to) {
    rate = 1;
  } else {
    const cacheKey = `${from}_${to}`;

    rate = rateCache.get(cacheKey);

    // ✅ 2. Fetch only if not cached
    if (!rate) {
      rate = await getConversionRate(from, to);

      // ✅ 3. fallback
      if (!rate) {
        rate = currencyConfig.defaultRate;
      }

      rateCache.set(cacheKey, rate);
    }
  }

  // ✅ 4. attach to row
  newRow["conversion"] = {
    baseCurrency: from,
    targetCurrency: to,
    rate
  };
}



    newRowData.push(newRow);
  }

  return {
    errors,
    newRowData,
    refCache
  };
}

export async function validateRowData({
  rowData,
  attributes,
  separator = ',',
  uniqueAttributeRules = [],
  entityId,
  dataSourceId,
  dataSourceVersionId,
}: {
  rowData: Record<string, any>;
  attributes: any[];
  separator?: string;
  uniqueAttributeRules?: Types.ObjectId[][];
  entityId?: any;
  dataSourceId?: string;
  dataSourceVersionId?: string;
}) {
  const errors: any[] = [];
  const validatedRowData: Record<string, any> = { ...rowData };

  // Create attribute ID → name map for lookup
  const attributeIdToNameMap = attributes.reduce(
    (acc, attr) => {
      acc[attr._id?.toString()] = attr.name;
      return acc;
    },
    {} as Record<string, string>
  );

  // -----------------------------------------
  // 1️⃣ Basic type & reference validation
  // -----------------------------------------
  for (const attr of attributes) {
    if (!Object.prototype.hasOwnProperty.call(rowData, attr.name)) continue;
    const value = validatedRowData[attr.name];

    // if normalization enabled
    if (attr.normalize === true) {
      validatedRowData[`${attr.name}_normalize`] = normalizeValue(value);
    }

    // Required validation
    if (value === undefined || value === null || value === '') {
      if (attr.required === 'Mandatory' || attr.required === true) {
        errors.push({
          attributeName: attr.name,
          errorType: 'Not Found',
          errorCode: '404',
          errorMessage: `Attribute "${attr.name}" is required but missing.`,
        });
      }
      continue;
    }

    // Reference resolution
    if (
      attr.referenceEntitySetting?.refEntityId &&
      ['one_to_one', 'many_to_one'].includes(attr.referenceEntitySetting?.relationType)
    ) {
      const refEntityId = attr.referenceEntitySetting.refEntityId;
      const refFieldId = attr.referenceEntitySetting.refEntityField;
      const refEntityField = await getEntityAttribute(refEntityId, refFieldId);
      const RefModel = await getModelForEntity(refEntityId);

      const escapedValue = escapeRegExp(String(value).trim());
      const regex = new RegExp(`^${escapedValue}$`, 'i');

      const referencedDoc: any = await RefModel.findOne({
        [`rowData.${refEntityField.name}`]: regex,
        status: 'active',
      });

      if (!referencedDoc) {
        errors.push({
          attributeName: attr.name,
          errorType: 'Reference Error',
          errorCode: '404',
          errorMessage: `"${attr.name}" - "${value}" not found.`,
        });
      } else {
        validatedRowData[attr.name] = referencedDoc._id;
        validatedRowData[`${attr.name}__display`] = referencedDoc.rowData?.[refEntityField.name];
      }
    } else {
      // Type validation
      const { isValid, convertedValue, attributeOptionValue } = await validateAndConvert({
        value,
        type: attr.type,
        optionAttributeId: attr.optionAttributeId,
        separator,
      });

      if (!isValid) {
        errors.push({
          attributeName: attr.name,
          errorType: 'Type Error',
          errorCode: '400',
          errorMessage: ['option', 'multioption'].includes(attr.type)
            ? `${attr.name} - ${value} is not valid ${attr.type}. Expected value from options: ${attributeOptionValue}`
            : `${attr.name} - Invalid value ${value} for ${attr.type} type`,
        });
      } else {
        validatedRowData[attr.name] = convertedValue;
      }
    }
  }

  // -----------------------------------------
  // 2️⃣ Unique Attribute Combination Validation
  // -----------------------------------------
  if (Array.isArray(uniqueAttributeRules) && uniqueAttributeRules.length > 0) {
    for (const rule of uniqueAttributeRules) {
      const keyValues: string[] = [];
      const displayKeyValues: string[] = [];
      let isValidCombination = true;

      for (const attrId of rule) {
        const attrName = attributeIdToNameMap[attrId.toString()];
        if (!attrName) {
          isValidCombination = false;
          break;
        }

        const val = validatedRowData[attrName];
        if (val === undefined || val === null || `${val}`.trim() === '') {
          isValidCombination = false;
          break;
        }

        keyValues.push(`${val}`.toLowerCase().trim());
        const displayKey = `${attrName}__display`;
        const displayValue = validatedRowData[displayKey] ?? val;
        displayKeyValues.push(`${displayValue}`.trim());
      }

      if (!isValidCombination) continue;

      // Build MongoDB query for duplicate check
      const compositeConditions = rule.map((attrId) => {
        const attrName = attributeIdToNameMap[attrId.toString()];
        return { [`rowData.${attrName}`]: validatedRowData[attrName] };
      });

      const DataSourceModel = await getModelForEntity(entityId);
      const duplicateRecord = await DataSourceModel.findOne({
        dataSourceId,
        dataSourceVersionId,
        status: 'active',
        $and: compositeConditions,
      });

      if (duplicateRecord) {
        errors.push({
          attributeName: displayKeyValues.join('|'),
          errorType: 'Duplicate Error',
          errorCode: '409',
          errorMessage: `Duplicate combination found for unique keys: ${displayKeyValues.join(' | ')}.`,
        });
      }

      // Only validate first valid rule
      break;
    }
  }

  // -----------------------------------------
  // 3️⃣ Cleanup
  // -----------------------------------------
  for (const key of Object.keys(validatedRowData)) {
    if (key.endsWith('__display')) delete validatedRowData[key];
  }

  return { isValid: errors.length === 0, errors, validatedRowData };
}

// =====================
// Reference cache
// =====================
const refMetaCache = new Map<
  string,
  {
    field: any;
    model: any;
  }
>();

async function getRefMeta(
  refEntityId: string,
  refEntityFieldId: string
) {
  const cacheKey = `${refEntityId}:${refEntityFieldId}`;

  if (!refMetaCache.has(cacheKey)) {
    const field = await getEntityAttribute(refEntityId, refEntityFieldId);
    const model = await getModelForEntity(refEntityId);

    refMetaCache.set(cacheKey, { field, model });
  }

  return refMetaCache.get(cacheKey)!;
}

// =====================
// Option value cache
// =====================
const optionCache = new Map<string, string[]>();

async function getOptionSet(optionAttributeId: string) {
  if (!optionCache.has(optionAttributeId)) {
    const opt =
      await attributeOptionService.findAttributeOptionById(optionAttributeId);

    optionCache.set(optionAttributeId, opt?.attributeValue || []);
  }

  return optionCache.get(optionAttributeId)!;
}

// =====================
// Regex cache (exact match, bracket-safe)
// =====================
const regexCache = new Map<string, RegExp>();
function getExactRegex(value: string): RegExp {
  const key = value.trim().toLowerCase();

  if (!regexCache.has(key)) {
    const escaped = escapeRegExp(value.trim());
    regexCache.set(key, new RegExp(`^${escaped}$`, 'i'));
  }

  return regexCache.get(key)!;
}


// =====================
// Reference value cache
// =====================
const refValueCache = new Map<string, any | null>();
async function resolveReference(
  refEntityId: string,
  // refEntityFieldId: string,
  value: string,
  field: any,
  matchStrategy: string,
  model: any
) {
  // 1️⃣ get metadata (cached)
  // const { field, model } = await getRefMeta(refEntityId, refEntityFieldId);
  if(matchStrategy === 'normalized'){
    value = normalizeValue(value);
  }
  // 2️⃣ value cache key
  const cacheKey = `${refEntityId}:${field.name}:${value.trim().toLowerCase()}`;

  if (refValueCache.has(cacheKey)) {
    return refValueCache.get(cacheKey);
  }

  let doc = null;

  // ✅ NORMALIZED MATCH
  if (matchStrategy === 'normalized') {
    doc =
      (await model.findOne({
        [`rowData.${field.name}_normalize`]: value,
        status: 'active',
      })) || null;

  } else {
     // 3️⃣ exact regex (bracket-safe)
  const regex = getExactRegex(value);
   doc =
    (await model.findOne({
      [`rowData.${field.name}`]: regex,
      status: 'active',
    })) || null;
  }

  refValueCache.set(cacheKey, doc);
  return doc;
}




export async function createDataSourceVersion(req: Request, res: Response, next: NextFunction) {
  try {
    const { versionName, mappings, separator, dataSourceId, versionValue } = req.body;
    const jsonMapping = JSON.parse(mappings);
    const jsonSeparator = separator ? JSON.parse(separator) : {};

    const { userId, organizationId, orgCode } = req?.user;


    const SPECIAL_DS_ID = "6878fab8a1dfb7e7aabb0f01"; // case list datasourceId

    if (
      dataSourceId === SPECIAL_DS_ID &&
      jsonMapping?.CaseNumber &&
      jsonMapping?.DisclosureNumber &&
      Array.isArray(jsonMapping.CaseNumber) &&
      Array.isArray(jsonMapping.DisclosureNumber)
    ) {
      jsonMapping.CaseNumber = Array.from(
        new Set([...jsonMapping.CaseNumber, ...jsonMapping.DisclosureNumber])
      );
    }

    const files = Array.isArray(req.files) ? req.files : Object.values(req.files!).flat();

    let combinedFileName = '';
    let combinedFilePath = '';
    let combinedMimType = '';
    let combinedSize = 0;
    let combinedData: any[] = [];
    let dataSourceVersionId;

    // reset cache for this import
    refMetaCache.clear();
    optionCache.clear();
    regexCache.clear();
    refValueCache.clear();

    for (const file of files) {
      const { originalname, path: tempPath, size, mimetype } = file;
      const fileName = originalname;
      const fileExtension = fileName.split('.').pop()?.toLowerCase();

      const newFilePath = path.join(
        'uploads',
        organizationId,
        userId,
        'dsvRequest',
        `${dataSourceId}_${versionValue}_${versionName}_${fileName}`
      );
      await fsPromises.mkdir(path.dirname(newFilePath), { recursive: true });
      await fsPromises.rename(tempPath, newFilePath);

      if (fileExtension && ['xlsx', 'xls'].includes(fileExtension)) {
        const fileData = await readExcelFile(newFilePath);
        // 🔹 Add fileRowNumber field for each row
        const fileDataWithRowNumber = fileData.map((row, index) => ({
          ...row,
          fileRowNumber: `${fileName}:${index + 2}`, // +1 to make it 1-based instead of 0-based
        }));
        combinedData = [...combinedData, ...fileDataWithRowNumber];
        combinedFileName = combinedFileName ? `${combinedFileName}|${fileName}` : fileName;
        combinedFilePath = combinedFilePath ? `${combinedFilePath}|${newFilePath}` : newFilePath;
        combinedMimType = combinedMimType ? `${combinedMimType}|${mimetype}` : mimetype;
        combinedSize += size;
      } else {
        throw new Error(`Invalid file format for ${fileName}`);
      }
    }

    const existingVersionData =
      await dataSourceVersionService.getDataSourceVersionBasedOnDataSourceIdAndVersionValueAndVersionName(
        dataSourceId,
        versionValue,
        versionName
      );

    if (existingVersionData) {
      return res.status(400).send('Version name already exists for same data source and version value.');
    }

    const dataSourceDetails = await dataSourceService.findDataSourceById(dataSourceId, true);

    if (dataSourceDetails && dataSourceDetails.entityId) {
      const dataSourceVersion: any = await dataSourceVersionService.createDataSourceVersion({
        organizationId,
        entityId: dataSourceDetails.entityId._id,
        dataSourceId,
        versionName,
        versionValue,
        createdBy: userId,
        status: 'processing',
        separator: jsonSeparator,
        fileName: combinedFileName,
        filePath: combinedFilePath,
        fileType: combinedMimType,
        fileSize: combinedSize,
        mappings: jsonMapping,
        isActive: true,
        isCurrent: false,
      });

      dataSourceVersionId = dataSourceVersion._id;
      debounceManager.debounce(dataSourceVersion._id.toString(), async () => {
        try {
          const entityDetails = dataSourceDetails.entityId as any;
          let attributes = entityDetails?.attributes || [];
          const versionValueData = versionValue;

          const fileData = await validateFileDataCondition({
            fileData: combinedData,
            attributeSetting: attributes,
            conditions: dataSourceDetails.condition,
            jsonMapping,
          });

          attributes = await autoPopulateAttributeOption({
            fileData: fileData,
            entityId: dataSourceDetails?.entityId || '',
            attributesDetails: attributes,
            attributMapping: jsonMapping,
            userId,
            organizationId,
          });

          const validatedData = await validateFileData({
            fileData,
            attributes,
            versionValue: versionValueData,
            mapping: jsonMapping,
            separator: jsonSeparator,
            dataSourceId: dataSourceId,
            dataSourceVersionId: dataSourceVersion._id.toString(),
            entityId: dataSourceDetails.entityId._id,
            uniqueAttributeRules: dataSourceDetails.uniqueAttributeRules,
            user: req?.user
          });

          if (validatedData.errors.length > 0) {
            await dataSourceVersionService.updateDataSourceVersion(dataSourceVersion._id.toString(), {
              status: 'failed',
            });
            const schemaName = getImportLogSchemaNameBasedOnVersionCodeAndOrgCode({
              orgCode,
              versionCode: dataSourceDetails.code,
            });
            await dataImportErrorServices.createManyDataImportError(validatedData.errors);
            await importLogDataSourceVersionValueService.createImportLogDataSourceVersionValue(
              schemaName,
              validatedData.newRowData
            );
          } else {
            const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
              orgCode,
              versionCode: dataSourceDetails.code,
            });
            if (dataSourceDetails.versionType == 'constant') {
              await dataSourceVersionValueService.updateDataSourceVersionValue(
                schemaName,
                validatedData.newRowData,
                attributes,
                dataSourceDetails.uniqueAttributeRules || []
              );
            } else {
              await dataSourceVersionValueService.createDataSourceVersionValue(schemaName, validatedData.newRowData);
            }

            await dataSourceVersionService.updateDataSourceVersions({
              query: { dataSourceId, versionValue },
              updateFields: { isCurrent: false },
            });

            await dataSourceVersionService.updateDataSourceVersion(dataSourceVersion._id.toString(), {
              status: 'completed',
              isCurrent: true,
            });
          }
          await attributeOptionService.updateAttributeOptionsByQuery({
                                                query: {
                                                  organizationId,
                                                  isPopulateFixed: 1,
                                                },
                                                updateFields: {
                                                  isPopulateFixed: 2,
                                                },
                                              });
          await dataSourceVersionValueService.bulkUpdateRefCache(validatedData.refCache);                                    

        } catch (error) {
          console.error('Error while processing data:', error);
        }
      });
    } else {
      throw new Error('Data source not found.');
    }

    return res.status(200).json({
      success: true,
      message: 'Data upload is in progress.',
      dataSourceVersionId,
      status: 'pending',
    });
  } catch (e) {
    next(e);
  }
}

export async function createDataSourceVersionFromValidatedCentralFiles(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      versionName,
      dataSourceId,
      year,
      month,
      week,
      centralFileIds
    } = req.body;

    const versionValue = `${year}-${month}`;

    const { userId, organizationId, orgCode } = req.user;

    if (!centralFileIds || !Array.isArray(centralFileIds) || centralFileIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'centralFileIds are required.'
      });
    }

    // ---------------------------------------
    // ✅ Fetch Latest Mapping & Separator
    // ---------------------------------------

    const { mapping, separator } =
      await getLatestCentralMappingAndSeparator({
        organizationId,
        dataSourceId,
        year,
        month,
        week,
      });

    // ✅ Since this controller works for ONE datasource
    const jsonMapping = mapping?.[dataSourceId] || {};
    const jsonSeparator = separator?.[dataSourceId] || {};
    

    // ✅ Central validated folder (WITH WEEK)
    const padMonth = String(month).padStart(2, '0');
    const validatedCentralPath = path.join(
      'uploads',
      organizationId,
      'central-files',
      dataSourceId,
      year,
      padMonth,
      ...(week ? [`W${week}`] : []),
      'validated'
    );

    // reset cache
    refMetaCache.clear();
    optionCache.clear();
    regexCache.clear();
    refValueCache.clear();

    // const existingFiles = await fsPromises.readdir(validatedCentralPath).catch(() => []);
    // if (!existingFiles.length) {
    //   throw new Error('No validated central files found.');
    // }

    // ✅ FETCH SELECTED CENTRAL FILES FROM DB
    const centralFilesFromDB = await findCentralFiles({
      _id: { $in: centralFileIds },
      organizationId,
      dataSourceId,
      year,
      month,
      ...(week ? { week } : {}),
      validationStatus: 'validated',
    });

    if (!centralFilesFromDB.length) {
      throw new Error('No validated central files found for selected IDs.');
    }

    let combinedFileName = '';
    let combinedFilePath = '';
    let combinedMimType = '';
    let combinedSize = 0;
    let combinedData: any[] = [];
    let dataSourceVersionId;

    for (const centralFile of centralFilesFromDB) {
      const fileName = centralFile.storedFileName;  // ✅ USE DB NAME
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'xls'].includes(fileExtension || '')) continue;

      const sourcePath = path.join(validatedCentralPath, fileName);

      const newFilePath = path.join(
        'uploads',
        organizationId,
        userId,
        'dsvRequest',
        `${dataSourceId}_${versionValue}_${versionName}_${fileName}`
      );

      await fsPromises.mkdir(path.dirname(newFilePath), { recursive: true });
      await fsPromises.copyFile(sourcePath, newFilePath);

      const fileData = await readExcelFile(newFilePath);

      const fileDataWithRowNumber = fileData.map((row, index) => ({
        ...row,
        fileRowNumber: `${fileName}:${index + 2}`,
      }));

      combinedData.push(...fileDataWithRowNumber);

      combinedFileName = combinedFileName
        ? `${combinedFileName}|${fileName}`
        : fileName;

      combinedFilePath = combinedFilePath
        ? `${combinedFilePath}|${newFilePath}`
        : newFilePath;

      combinedSize += (await fsPromises.stat(newFilePath)).size;
      combinedMimType = combinedMimType
        ? `${combinedMimType}|application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    const dataSourceDetails =
      await dataSourceService.findDataSourceById(dataSourceId, true);

    if (!dataSourceDetails?.entityId) {
      throw new Error('Data source not found.');
    }

    const existingVersionData =
      await dataSourceVersionService.getDataSourceVersionBasedOnDataSourceIdAndVersionValueAndVersionName(
        dataSourceId,
        versionValue,
        versionName
      );

    if (existingVersionData) {
      return res.status(400).send(
        'Version name already exists for same data source and version value.'
      );
    }

    const dataSourceVersion: any =
      await dataSourceVersionService.createDataSourceVersion({
        organizationId,
        entityId: dataSourceDetails.entityId._id,
        dataSourceId,
        versionName,
        versionValue,
        createdBy: userId,
        status: 'processing',
        separator: jsonSeparator,
        fileName: combinedFileName,
        filePath: combinedFilePath,
        fileType: combinedMimType,
        fileSize: combinedSize,
        mappings: jsonMapping,
        isActive: true,
        isCurrent: false,
      });

    dataSourceVersionId = dataSourceVersion._id;

    // ✅ Background processing (same pattern as your other function)
    debounceManager.debounce(dataSourceVersion._id.toString(), async () => {
      try {
        const entityDetails = dataSourceDetails.entityId as any;
        let attributes = entityDetails?.attributes || [];

        const fileData = await validateFileDataCondition({
          fileData: combinedData,
          attributeSetting: attributes,
          conditions: dataSourceDetails.condition,
          jsonMapping,
        });

        attributes = await autoPopulateAttributeOption({
          fileData,
          entityId: dataSourceDetails.entityId,
          attributesDetails: attributes,
          attributMapping: jsonMapping,
          userId,
          organizationId,
        });

        const validatedData = await validateFileData({
          fileData,
          attributes,
          versionValue,
          mapping: jsonMapping,
          separator: jsonSeparator,
          dataSourceId,
          dataSourceVersionId: dataSourceVersion._id.toString(),
          entityId: dataSourceDetails.entityId._id,
          uniqueAttributeRules: dataSourceDetails.uniqueAttributeRules,
          user:req.user
        });

        if (validatedData.errors.length > 0) {
          await dataSourceVersionService.updateDataSourceVersion(
            dataSourceVersion._id.toString(),
            { status: 'failed' }
          );

          const importLogSchema =
            getImportLogSchemaNameBasedOnVersionCodeAndOrgCode({
              orgCode,
              versionCode: dataSourceDetails.code,
            });

          await dataImportErrorServices.createManyDataImportError(
            validatedData.errors
          );

          await importLogDataSourceVersionValueService.createImportLogDataSourceVersionValue(
            importLogSchema,
            validatedData.newRowData
          );
        } else {
          const schemaName =
            getSchemaNameBasedOnVersionCodeAndOrgCode({
              orgCode,
              versionCode: dataSourceDetails.code,
            });

          await dataSourceVersionValueService.createDataSourceVersionValue(
            schemaName,
            validatedData.newRowData
          );

          await dataSourceVersionService.updateDataSourceVersions({
            query: { dataSourceId, versionValue },
            updateFields: { isCurrent: false },
          });

          await dataSourceVersionService.updateDataSourceVersion(
            dataSourceVersion._id.toString(),
            {
              status: 'completed',
              isCurrent: true,
            }
          );
        }

        await attributeOptionService.updateAttributeOptionsByQuery({
          query: { organizationId, isPopulateFixed: 1 },
          updateFields: { isPopulateFixed: 2 },
        });

      } catch (error) {
        console.error('Error while processing data:', error);
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Data upload from validated central files is in progress.',
      dataSourceVersionId,
      status: 'pending',
    });
  } catch (err) {
    next(err);
  }
}


export const checkDataSourceVersionNameAvailableOrNot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { versionName, dataSourceId, versionValue } = req.params;

    const existingVersionData =
      await dataSourceVersionService.getDataSourceVersionBasedOnDataSourceIdAndVersionValueAndVersionName(
        dataSourceId,
        versionValue,
        versionName
      );
    if (existingVersionData) {
      res.status(200).json({
        success: true,
        available: false,
        message: versionName,
      });
    } else {
      res.status(200).json({
        success: true,
        available: true,
        message: versionName,
        dataSourceId,
        versionValue,
      });
    }
  } catch (err) {
    next(err);
  }
};

export const listDataSourceVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, paginate = 'false' } = req.query;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const { organizationId } = req.user;

    const query: any = { organizationId };
    if (search) query.name = { $regex: search, $options: 'i' };

    let result: any = {};
    if (paginate) {
      result = await dataSourceVersionService.getDataSourceVersionList({
        query,
        page,
        limit,
        populate: [
          {
            path: 'createdBy',
            select: 'firstName lastName', // Specify the fields to populate
          },
          {
            path: 'updatedBy',
            select: 'firstName lastName', // Specify the fields to populate
          },
          {
            path: 'dataSourceId',
            select: 'name', // Specify the fields to populate
          },
        ],
      });
    } else {
      result = await dataSourceService.getDataSourceList({
        query,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Data Source Version Fetched Successfully',
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (err) {
    next(err);
  }
};

// export async function createMultipleDataSourceVersionBasedOnCustomReportId(
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) {
//   try {
//     console.log('Inside createMultipleDataSourceVersionBasedOnCustomReportId function.');
//     const { mappings, separator, customReportId, versionValue } = req.body;
//     const allJsonMapping = JSON.parse(mappings);

//     const allJsonSeparator = separator ? JSON.parse(separator) : {};

//     const { userId, organizationId, orgCode } = req?.user;

//     const files = Array.isArray(req.files) ? req.files : Object.values(req.files!).flat();
//     const customReportData = await customReportServices.findCustomReportById(customReportId);
//     if (customReportData && customReportData.dataSourceIds) {
//       const currentDateTime = DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss');
//       const generateReportFileName = `${customReportData.reportName}_${versionValue}_${currentDateTime}.xlsx`;
//       const reportRequestPayload = {
//         organizationId: organizationId,
//         versionValue: versionValue,
//         customReportId: customReportData._id,
//         status: 'processing',
//         fileName: generateReportFileName,
//         filePath: path.join('uploads', organizationId, userId, 'generatedReports', `${generateReportFileName}`),
//         fileType: 'xlsx',
//         createdBy: userId,
//       };
//       const requestedReport = await reportRequestService.createReportRequest(reportRequestPayload);
//       debounceManager.debounce(customReportId as string, async () => {
//         const dAllJsonMapping = allJsonMapping;
//         const dAllJsonSeparator = allJsonSeparator;
//         const dUserId = userId;
//         const dOrganizationId = organizationId;
//         const dOrgCode = orgCode;
//         const dFiles = files;
//         const dcustomReportData = customReportData;
//         const reportRequestId = requestedReport._id;
//         // console.log('dcustomReportData',dcustomReportData);
//         try {
//           for (let i = 0; i < dcustomReportData?.dataSourceIds?.length!; i++) {
//             const dataSourceInfo = dcustomReportData?.dataSourceIds[i];
//             const dataSourceId = dataSourceInfo?.dataSourceId!;

//             const fileDetails = dataSourceInfo?.fileDetails!;
//             let dataSourceVersion: any = '';
//             let entityDetails: any = '';
//             let dataSourceDetails: any = '';
//             let validationErrors: any[] = [];
//             let validatedFinalData: any[] = [];
//             // console.log('fileDetails',fileDetails);
//             if (fileDetails) {
//               for (let j = 0; j < fileDetails.length; j++) {
//                 try {
//                   const fileDetailName = fileDetails[j].name;
//                   const sheetName = fileDetails[j].sheetName;

//                   let mappingName = fileDetailName;
//                   if (sheetName && sheetName.length > 0) {
//                     mappingName = `${mappingName}__${sheetName}`;
//                   }
//                   const file = dFiles.find((file) => {
//                     return (
//                       file.originalname.split('.')[0].replace(/\s+/g, '').toLowerCase() ===
//                       fileDetailName.replace(/\s+/g, '').toLowerCase()
//                     );
//                   });
//                   // console.log('file',file);
//                   if (file) {
//                     const totalFiles = fileDetails.length;
//                     const currentFileIndex = j + 1;
//                     const progressPercentage = ((j / totalFiles) * 100).toFixed(0);
//                     console.log(
//                       `Processing file ${fileDetailName} [${currentFileIndex} of ${totalFiles}] (${progressPercentage}% complete)`
//                     );

//                     const { originalname, path: filePath, size, mimetype } = file;

//                     const fileName = originalname;
//                     const fileExtension = fileName.split('.').pop();
//                     const newFilePath = path.join(
//                       'uploads',
//                       dOrganizationId,
//                       dUserId,
//                       'dsvRequest',
//                       `${dataSourceId}_${versionValue}_${fileName}`
//                     );
//                     try {
//                       await fsPromises.access(filePath);
//                       await fsPromises.mkdir(path.dirname(newFilePath), { recursive: true });
//                       await fsPromises.copyFile(filePath, newFilePath);
//                     } catch (e) {
//                       console.error('File not found.', e);
//                     }

//                     if (fileExtension && ['xlsx', 'xls'].includes(fileExtension)) {
//                       const jsonMapping = dAllJsonMapping[mappingName] || {};
//                       const jsonSeparator = dAllJsonSeparator[fileDetailName] || {};
//                       if (!dataSourceVersion) {
//                         dataSourceDetails = await dataSourceService.findDataSourceById(dataSourceId, true);
//                         if (dataSourceDetails && dataSourceDetails.entityId) {
//                           await dataSourceVersionService.updateDataSourceVersions({
//                             query: { dataSourceId, versionValue },
//                             updateFields: { isCurrent: false },
//                           });
//                           dataSourceVersion = await dataSourceVersionService.createDataSourceVersion({
//                             organizationId,
//                             entityId: dataSourceDetails.entityId._id,
//                             dataSourceId,
//                             versionValue,
//                             createdBy: dUserId,
//                             status: 'processing',
//                             separator: jsonSeparator,
//                             fileName: fileName,
//                             filePath: newFilePath,
//                             fileType: mimetype,
//                             fileSize: size,
//                             mappings: jsonMapping,
//                             isActive: true,
//                             isCurrent: false,
//                           });
//                           entityDetails = dataSourceDetails.entityId as any;
//                         } else {
//                           console.error('Data source details not found.');
//                         }
//                       }

//                       const readSheetName = sheetName ? [sheetName] : [];
//                       if (fileDetailName === 'KSA Contracts') {
//                         const currentYear = versionValue.split('-')[0];
//                         const prevYear = (Number(currentYear) - 1).toString();
//                         readSheetName.push(currentYear);
//                         readSheetName.push(prevYear);
//                       }

//                       const fileData = await readExcelFile(newFilePath, readSheetName);
//                       const fileDataWithRowNumber = fileData.map((row, index) => ({
//                         ...row,
//                         fileRowNumber: `${fileName}:${index + 2}`, // +1 to make it 1-based instead of 0-based
//                       }));

//                       let attributes = entityDetails?.attributes || [];
//                       attributes = await autoPopulateAttributeOption({
//                         fileData: fileData,
//                         entityId: dataSourceDetails?.entityId || '',
//                         attributesDetails: attributes,
//                         attributMapping: jsonMapping,
//                         userId,
//                         organizationId,
//                       });
//                       const validatedData = await validateFileData({
//                         fileData: fileDataWithRowNumber,
//                         attributes,
//                         versionValue,
//                         mapping: jsonMapping,
//                         separator: jsonSeparator,
//                         dataSourceId: dataSourceId,
//                         dataSourceVersionId: dataSourceVersion._id as string,
//                         entityId: entityDetails._id,
//                       });

//                       if (validatedData.errors.length > 0) {
//                         validationErrors = [...validationErrors, ...validatedData.errors];
//                       }
//                       validatedFinalData = [...validatedFinalData, ...validatedData.newRowData];
//                     } else {
//                       console.error('Invalid file type. Please upload a file in XLSX or XLS format.');
//                     }
//                     const progressPercentage2 = ((currentFileIndex / totalFiles) * 100).toFixed(0);

//                     console.log(
//                       `Processed file ${fileDetailName} [${currentFileIndex} of ${totalFiles}] (${progressPercentage2}% complete)`
//                     );

//                     console.log('Sleeping for 3 seconds...');
//                     await sleep(3000);
//                   }
//                 } catch (e) {
//                   console.log(`Error while processing the file: ${fileDetails[j].name}`, e);
//                 }
//               }
//             }
//             // console.log('validationErrors',validationErrors);
//             // console.log('dataSourceVersion',dataSourceVersion);
//             if (dataSourceVersion) {
//               if (validationErrors.length > 0) {
//                 await dataSourceVersionService.updateDataSourceVersion(dataSourceVersion._id as string, {
//                   status: 'failed',
//                 });

//                 await dataImportErrorServices.createManyDataImportError(validationErrors);
//               } else {
//                 const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
//                   orgCode: dOrgCode,
//                   versionCode: dataSourceDetails.code,
//                 });
//                 await dataSourceVersionValueService.createDataSourceVersionValue(schemaName, validatedFinalData);
//                 // await dataSourceVersionService.updateDataSourceVersions({
//                 //   query: { dataSourceId, versionValue },
//                 //   updateFields: { isCurrent: false },
//                 // });
//                 await dataSourceVersionService.updateDataSourceVersion(dataSourceVersion._id as string, {
//                   status: 'completed',
//                   isCurrent: true,
//                 });
//               }
//             }
//           }

//           for (const file of dFiles) {
//             if (file.path) {
//               try {
//                 await fsPromises.unlink(file.path); // Deletes the file asynchronously
//               } catch (error) {
//                 console.error(`Error deleting file ${file.path}:`, error);
//               }
//             }
//           }
//           console.log('Sleeping for 3 seconds before generating custom report...');
//           await sleep(3000);
//           await generateCustomReportsFunction({
//             versionValue,
//             userId: dUserId,
//             organizationId: dOrganizationId,
//             orgCode: dOrgCode,
//             customReportId,
//             reportRequestId,
//           });
//         } catch (e) {
//           console.error('An error occurred while processing data source versions.', e);
//         }
//       });
//     } else {
//       throw 'Custom report details not found.';
//     }

//     return res.status(200).json({
//       success: true,
//       message: 'Data upload is in progress.',
//     });
//   } catch (e) {
//     next(e);
//   }
// }


export const createUpdateCustomDataSourceVersionValueFunction = async ({
  dataSourceId,
  versionValue,
  versionData,
  userId,
  organizationId,
  orgCode,
  customReportId,
  reportRequestId,
}: {
  dataSourceId: string;
  versionValue: string;
  versionData: any;
  userId: string;
  organizationId: string;
  orgCode: string;
  customReportId?: string;
  reportRequestId?: string;
}) => {
  try {
    const dataSourceDetails = await dataSourceService.findDataSourceById(dataSourceId, true);
    if (dataSourceDetails) {
      await dataSourceVersionService.updateDataSourceVersions({
        query: { dataSourceId, versionValue },
        updateFields: { isCurrent: false },
      });
      const dataSourceVersion: any = await dataSourceVersionService.createDataSourceVersion({
        organizationId,
        entityId: dataSourceDetails.entityId._id,
        dataSourceId,
        versionValue,
        createdBy: userId,
        status: 'processing',
        isActive: true,
        isCurrent: false,
        customReportId,
        reportRequestId,
      });

      const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
        orgCode: orgCode,
        versionCode: dataSourceDetails.code,
      });

      const nowUtc = DateTime.utc();
      const finalData: any[] = [];
      for (let i = 0; i < versionData.length; i++) {
        const newRow = {
          dataSourceId,
          versionValue,
          entityId: dataSourceDetails.entityId._id,
          dataSourceVersionId: dataSourceVersion._id,
          rowData: versionData[i],
          createdAt: nowUtc.plus({ seconds: i }),
          updatedAt: nowUtc.plus({ seconds: i }),
        };

        finalData.push(newRow);
      }
      await dataSourceVersionValueService.createDataSourceVersionValue(schemaName, finalData);

      await dataSourceVersionService.updateDataSourceVersion(dataSourceVersion._id.toString(), {
        status: 'completed',
        isCurrent: true,
      });

      return { dataSourceVersionId: dataSourceVersion._id, versionCode: dataSourceDetails.code };
    } else {
      throw 'Data source not found.';
    }
  } catch (e) {
    console.log('Error in createUpdateCustomDataSourceVersionValueFunction.', e);
    throw e;
  }
};

export const updateCustomDataSourceVersionIsCurrentFunction = async ({
  dataSourceVersionId,
}: {
  dataSourceVersionId: string;
}) => {
  try {
    const dataSourceVersionDetails: any = await dataSourceVersionService.getDataSourceVersionDetailBasedOnId({
      _id: new Types.ObjectId(dataSourceVersionId),
    });
    if (dataSourceVersionDetails && dataSourceVersionDetails.dataSourceId) {
      await dataSourceVersionService.updateDataSourceVersions({
        query: {
          dataSourceId: dataSourceVersionDetails.dataSourceId,
          versionValue: dataSourceVersionDetails.versionValue,
        },
        updateFields: { isCurrent: false },
      });
      await dataSourceVersionService.updateDataSourceVersion(dataSourceVersionDetails._id.toString(), {
        status: 'completed',
        isCurrent: true,
      });
    }
  } catch (e) {
    console.log('Error in createUpdateCustomDataSourceVersionValueFunction.', e);
    throw e;
  }
};

export const createUpdateCustomDataSourceVersionValue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dataSourceId, versionValue, versionData } = req.body;
    const { userId, organizationId, orgCode } = req?.user;

    if (Array.isArray(versionData)) {
      await createUpdateCustomDataSourceVersionValueFunction({
        dataSourceId,
        versionValue,
        versionData,
        userId,
        organizationId,
        orgCode,
      });
      return res.status(200).json({
        success: true,
        message: 'Data has been successfully updated.',
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid data format.' });
    }
  } catch (e) {
    console.log('Error in createUpdateDataSourceVersionValue', e);
    next(e);
  }
};

export const getDataSourceVersionDataBasedOnDataSourceIdAndVersionValue = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { dataSourceId, versionValue, page, limit, sort, filters, search } = req.query as {
      dataSourceId: string;
      versionValue: string;
      page?: string;
      limit?: string;
      sort?: string;
      filters?: string;
      search?: string;
    };

    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    const { orgCode, userId, organizationId } = req.user;

    const searchFilters = {};

    const dataSourceDetails: any = await dataSourceService.findDataSourceById(dataSourceId, true);

    if (!dataSourceDetails) {
      return res.status(404).json({ success: false, message: 'Data source not found.' });
    }

    // 🔹 Precompute field mappings
    const fieldOptions = await entityService.getEntityFieldOptions(String(dataSourceDetails.entityId._id));

    if (Array.isArray(dataSourceDetails.fieldSettings)) {
      for (const field of dataSourceDetails.fieldSettings) {
        // Derived fields
        if (field.isDerived && field.attributeId) {
          const derived = await findDerivedFieldById(field.attributeId);
          if (derived) {
            field.mappedAttributeName = `Derived.${derived.name}`;
            field.values = Array.isArray(derived.valueRules) ? derived.valueRules.map((vr) => vr.value) : [];
          }
          continue;
        }

        // Normal fields → look up in fieldOptions
        const match = fieldOptions.find(
          (opt) =>
            String(opt.value.attributeId) === String(field.attributeId) &&
            JSON.stringify(opt.value.refAttributeId || []) === JSON.stringify(field.refAttributeId || [])
        );

        if (match) {
          field.mappedAttributeName = match.label;
        } else {
          field.mappedAttributeName = 'Unknown';
        }
      }
    }

    // 🔹 Build search filters using mappedAttributeName
    if (search && search.length > 0) {
      for (const field of dataSourceDetails.fieldSettings) {
        if (!field.mappedAttributeName || field.mappedAttributeName === 'Unknown') continue;

        searchFilters[field.mappedAttributeName] = search;
      }
    }

    const versionQuery: any = {
      dataSourceId,
      isCurrent: true, // Always filter for current version
    };

    if (versionValue) {
      versionQuery.versionValue = versionValue; // Optional, narrows to specific version if provided
    }

    const dataSourceVersionDetails = await dataSourceVersionService.getDataSourceVersionList({
      query: versionQuery,
    });

    if (!dataSourceVersionDetails?.data?.length) {
      return res.status(200).json({
        success: true,
        message: 'Version data has been successfully retrieved.',
        data: [],
        totalCount: 0,
      });
    }

    const dataSourceVersionId = dataSourceVersionDetails.data[0]._id;
    const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: dataSourceDetails.code,
    });

    const parsedSort = sort ? JSON.parse(sort) : {};
    const parsedFilters = filters ? JSON.parse(filters) : {};
    let query = { status: 'active' };
    if (dataSourceDetails.versionType != 'constant') {
      query['dataSourceVersionId'] = dataSourceVersionId;
    }
    // console.log(userId,dataSourceId,organizationId);
    // 🔹 🧩 Apply user-level data permission filters
    const userPermission = await getUserDataPermissionRecord({
                              userId,
                              dataSourceId,
                              organizationId
                            });
    // console.log('permissionFilter',userPermission);
    // if (userPermission?.conditions?.length) {
    //   const permissionFilter = await createMongoCondition(userPermission.conditions);
    //   Object.assign(query, permissionFilter);
    // }


    const result = await dataSourceVersionValueService.getDataSourceVersionValueV1({
      schemaName,
      query,
      select: '',
      page: pageNumber,
      limit: limitNumber,
      sort: parsedSort,
      filters: parsedFilters,
      entityId: dataSourceDetails.entityId,
      searchFilters,
      conditions: userPermission?.conditions
    });
    const data = result?.data ?? [];
    const totalCount = result?.totalCount ?? 0;

    return res.status(200).json({
      success: true,
      message: 'Version data has been successfully retrieved.',
      data,
      totalCount,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCount / limitNumber),
        totalRecords: totalCount,
      },
    });
  } catch (e) {
    console.log('Error in getDataSourceVersionDataBasedOnDataSourceIdAndVersionValue:', e);
    next(e);
  }
};

export const exportDataSourceVersionDataToExcel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { dataSourceId, versionValue, filters, search, selectedFields } = req.query as {
      dataSourceId: string;
      versionValue?: string;
      filters?: string;
      search?: string;
      selectedFields?: string; // optional now
    };

    const { orgCode, userId, organizationId } = req.user;

    // 🔹 Data Source details
    const dataSourceDetails: any = await dataSourceService.findDataSourceById(dataSourceId, true);
    if (!dataSourceDetails) {
      return res.status(404).json({ success: false, message: 'Data source not found.' });
    }

    // 🔹 Field mappings
    const fieldOptions = await entityService.getEntityFieldOptions(String(dataSourceDetails.entityId._id));

    if (Array.isArray(dataSourceDetails.fieldSettings)) {
      for (const field of dataSourceDetails.fieldSettings) {
        // Derived fields
        if (field.isDerived && field.attributeId) {
          const derived = await findDerivedFieldById(field.attributeId);
          if (derived) {
            field.mappedAttributeName = `Derived.${derived.name}`;
            field.values = Array.isArray(derived.valueRules)
              ? derived.valueRules.map((vr) => vr.value)
              : [];
          }
          continue;
        }

        // Normal fields
        const match = fieldOptions.find(
          (opt) =>
            String(opt.value.attributeId) === String(field.attributeId) &&
            JSON.stringify(opt.value.refAttributeId || []) ===
              JSON.stringify(field.refAttributeId || [])
        );
        field.mappedAttributeName = match ? match.label : 'Unknown';
      }
    }

    // 🔹 Build search filters using mappedAttributeName (unchanged)
    const searchFilters: any = {};
    if (search && search.length > 0) {
      for (const field of dataSourceDetails.fieldSettings) {
        if (!field.mappedAttributeName || field.mappedAttributeName === 'Unknown') continue;
        searchFilters[field.mappedAttributeName] = search;
      }
    }

    // 🔹 Build version query
    const versionQuery: any = {
      dataSourceId,
      isCurrent: true,
    };
    if (versionValue) versionQuery.versionValue = versionValue;

    const dataSourceVersionDetails = await dataSourceVersionService.getDataSourceVersionList({
      query: versionQuery,
    });

    if (!dataSourceVersionDetails?.data?.length) {
      return res.status(404).json({ success: false, message: 'No version data found.' });
    }

    const dataSourceVersionId = dataSourceVersionDetails.data[0]._id;
    const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: dataSourceDetails.code,
    });

    const parsedFilters = filters ? JSON.parse(filters) : {};
    const query: any = { status: 'active' };

    if (dataSourceDetails.versionType !== 'constant') {
      query['dataSourceVersionId'] = dataSourceVersionId;
    }

    // 🔹 Apply user-level data permissions
    const userPermission = await getUserDataPermissionRecord({
      userId,
      dataSourceId,
      organizationId,
    });


    // --------------------------------------------------------------------
    // 2️ CREATE PAYLOAD FOR WORKER
    // --------------------------------------------------------------------

    const requestPayload = {
      schemaName,
      query,
      select: "",
      page: 1,
      limit: Number.MAX_SAFE_INTEGER,
      sort: {},
      filters: parsedFilters,
      entityId: dataSourceDetails.entityId,
      searchFilters,
      conditions: userPermission?.conditions,
      selectedFields,
      dataSourceDetails,
    };

    // --------------------------------------------------------------------
    // 3️ SAVE DOWNLOAD REQUEST
    // --------------------------------------------------------------------
    const fileName = `${dataSourceDetails.name}_Export_Data_${formatDateTime(Date.now())}.xlsx`;
    const downloadRequest = await createDownloadRequest({
      organizationId,
      userId,
      status: "pending",
      fileName,
      requestPayload,
      dataSourceId
    });

    // --------------------------------------------------------------------
    // 4️ PUSH JOB INTO QUEUE
    // --------------------------------------------------------------------

    const downloadQueue = new Queue("downloadQueue", {
      connection: { host: "redis" },
    });

    await downloadQueue.add("exportDSData", { downloadRequestId: downloadRequest._id });

    return res.status(200).json({
      success: true,
      message: "Export job queued successfully.",
      requestId: downloadRequest._id,
    });

    // 🔹 Fetch data
    // const result = await dataSourceVersionValueService.getDataSourceVersionValueV1({
    //   schemaName,
    //   query,
    //   select: '',
    //   page: 1,
    //   limit: Number.MAX_SAFE_INTEGER,
    //   sort: {},
    //   filters: parsedFilters,
    //   entityId: dataSourceDetails.entityId,
    //   searchFilters,
    //   conditions: userPermission?.conditions,
    // });

    // const data = result?.data ?? [];
    // if (!data.length) {
    //   return res.status(200).json({ success: true, message: 'No data available for export.' });
    // }

    // // 🔹 Prepare Excel workbook
    // const workbook = new ExcelJS.Workbook();
    // const worksheet = workbook.addWorksheet('Export');

    // // If no selectedFields provided, include all fieldSettings
    // const parseSelectedFields = selectedFields ? JSON.parse(selectedFields) : {};
    // const selectedFieldConfigs =
    //   Array.isArray(parseSelectedFields) && parseSelectedFields.length > 0
    //     ? dataSourceDetails.fieldSettings.filter((f: any) =>
    //         parseSelectedFields.includes(f.attributeId?.toString() || f.mappedAttributeName)
    //       )
    //     : dataSourceDetails.fieldSettings;

    // // Headers
    // const headers = selectedFieldConfigs.map((f: any) => ({
    //   header: f.mappedAttributeName || f.fieldName || 'Unknown',
    //   key: f.mappedAttributeName,
    //   width: 25,
    // }));

    // worksheet.columns = headers;

    // // Data rows
    // data.forEach((row: any) => {
    //   const record: any = {};
    //   selectedFieldConfigs.forEach((f: any) => {
    //     record[f.mappedAttributeName] = row[f.mappedAttributeName] ?? '';
    //   });
    //   worksheet.addRow(record);
    // });

    // // Format headers
    // worksheet.getRow(1).font = { bold: true };
    // worksheet.getRow(1).alignment = { horizontal: 'center' };

    // // 🔹 Send Excel file
    // res.setHeader(
    //   'Content-Type',
    //   'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    // );
    // res.setHeader(
    //   'Content-Disposition',
    //   `attachment; filename=DataSource_${dataSourceDetails.code}_${versionValue || 'latest'}.xlsx`
    // );

    // await workbook.xlsx.write(res);
    // res.end();
  } catch (e) {
    console.error('Error in exportDataSourceVersionDataToExcel:', e);
    next(e);
  }
};


export async function handleReferenceSubFields({
  rowData,
  attributes,
  dataSourceId,
  versionId,
  versionValue,
  userId,
  organizationId,
}) {
  const dottedKeys = Object.keys(rowData).filter((key) => key.includes('.'));
  for (const key of dottedKeys) {
    if (!key.includes('.')) continue; // Only dotted keys

    const [parentAttrName, subAttrName] = key.split('.');

    // Find attribute whose subfield matches the dotted key
    const attr = attributes.find(
      (a) => a.referenceEntitySetting?.refEntityId && a.referenceEntitySetting?.refEntityField && subAttrName
    );
    if (!attr || !attr.referenceEntitySetting) continue;

    const relationType = attr.referenceEntitySetting.relationType;

    // Fetch referenced entity
    const refEntity: any = await findEntityById(attr.referenceEntitySetting.refEntityId.toString());
    if (!refEntity) continue;

    // Find subfield marked as isReferenceEdit
    const subAttr = refEntity.attributes.find((a) => a.name === subAttrName && a.isReferenceEditable == 'EDIT');
    if (!subAttr) continue;

    // Reference model for sub-entity (used for mapping)
    const RefModel = await getModelForEntity(refEntity._id);

    // Get reference field name
    const refFieldAttr = refEntity.attributes.find(
      (a) => String(a._id) === String(attr.referenceEntitySetting.refEntityField)
    );
    if (!refFieldAttr) continue;
    const refFieldName = refFieldAttr.name;

    const parentValue = rowData[parentAttrName]; // main row value
    const subValue = rowData[key];

    // -------------------------------
    // 1️⃣ Mapping reference logic
    // -------------------------------
    console.log('relationType', relationType);
    if (['mapping_one_to_one', 'mapping_many_to_one'].includes(relationType)) {
      // 1️⃣ Resolve parent doc (_id) → AttorneyName
      const parentRefFieldAttr = await getEntityAttribute(
        attr.referenceEntitySetting.refEntityId,
        attr.referenceEntitySetting.refEntityField
      );
      const parentRefFieldName = parentRefFieldAttr?.name;
      const parentRefModel = await getModelForEntity(parentRefFieldAttr.referenceEntitySetting?.refEntityId);
      console.log('parentRefFieldName', parentValue, parentRefModel);
      const parentDoc = await parentRefModel.findOne({
        [`rowData.${parentRefFieldName}`]: parentValue,
        'status': 'active'
      });
      if (!parentDoc) continue;
      const parentId = parentDoc._id;

      // -------------------------------
      // Mark existing mappings as inactive
      // -------------------------------
      console.log('refFieldName', refFieldName, parentId, RefModel, versionId);
      await RefModel.updateMany(
        { [`rowData.${refFieldName}`]: parentId },
        {
          $set: {
            status: "in-active",
            updatedAt: new Date(),
          },
        },
        { strict: false } // Allow dynamic path updates in rowData
      );

      // 2️⃣ Resolve subfield doc (_id) → FOName
      const subRefModel = await getModelForEntity(subAttr.referenceEntitySetting.refEntityId);

      if (relationType === 'mapping_many_to_one') {
        const subValuesArray = Array.isArray(subValue) ? subValue : [subValue];

        for (const val of subValuesArray) {
          console.log('val', val, subAttr.name);
          const escapedValue = escapeRegExp(val.trim());
          const regex = new RegExp(`^${escapedValue}$`, 'i'); // ✅ use RegExp object
          const subRefDoc = await subRefModel.findOne({ [`rowData.${subAttr.name}`]: regex, 'status': 'active' });
          console.log('subRefDoc', subRefDoc, regex, parentId);
          if (!subRefDoc) continue;
          const subId = subRefDoc._id;

          // 3️⃣ Upsert mapping table
          await RefModel.updateOne(
            {
              [`rowData.${refFieldName}`]: parentId,
              [`rowData.${subAttr.name}`]: subId,
            },
            {
              $set: {
                [`rowData.${refFieldName}`]: parentId,
                [`rowData.${subAttr.name}`]: subId,
                status: 'active', // ✅ always update status
                dataSourceId,
                dataSourceVersionId: versionId,
                versionValue,
                organizationId,
                updatedAt: new Date(),
              },
              $setOnInsert: {
                createdBy: userId, // ✅ only set on new insert
                createdAt: new Date(),
              },
            },
            {
              upsert: true,
              strict: false, // ✅ allow dynamic rowData paths
            }
          );

        }
      } else {
        // mapping_one_to_one → single subValue
        const escapedValue = escapeRegExp(subValue.trim());
        const regex = new RegExp(`^${escapedValue}$`, 'i'); // ✅ use RegExp object
        const subRefDoc = await subRefModel.findOne({ [`rowData.${subAttr.name}`]: regex, 'status': 'active' });
        if (!subRefDoc) continue;
        const subId = subRefDoc._id;

       await RefModel.updateOne(
        {
          [`rowData.${refFieldName}`]: parentId,
        },
        {
          $set: {
            [`rowData.${refFieldName}`]: parentId,
            [`rowData.${subAttr.name}`]: subId,
            status: 'active', // ✅ ensure always updated
            dataSourceId,
            dataSourceVersionId: versionId,
            versionValue,
            organizationId,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdBy: userId, // ✅ only on first insert
            createdAt: new Date(),
          },
        },
        {
          upsert: true,
          strict: false, // ✅ allow dynamic rowData.<field> paths
        }
      );

      }
      // ✅ Remove dotted key from rowData in parent document
      console.log('parentRefModel', parentRefModel, parentId, key);
      const doc: any = await parentRefModel.findById(parentId);
      if (doc && doc.rowData && key in doc.rowData) {
        delete doc.rowData[key]; // remove the literal key with dots
        await parentRefModel.updateOne({ _id: parentId }, { $set: { rowData: doc.rowData, status: 'active' } });
      }
      continue; // done with mapping case
    }

    // -------------------------------
    // 2️⃣ Normal reference logic
    // -------------------------------
    let parentValueResolved;
    if (relationType === 'many_to_one') {
      const parentValuesArray = Array.isArray(parentValue) ? parentValue : [parentValue];

      parentValueResolved = await Promise.all(
        parentValuesArray.map(async (v) => {
          const existingRow: any = await RefModel.findById(v);
          return existingRow ? existingRow.rowData[refFieldName] : null;
        })
      );
      parentValueResolved = parentValueResolved.filter((v) => v != null);
      if (!parentValueResolved.length) continue;

      const subValues = Array.isArray(subValue) ? subValue : [subValue];

      // Mark inactive any missing entries
      const existingRows: any[] = await RefModel.find({
        [`rowData.${refFieldName}`]: { $in: parentValueResolved },
        'status': 'active'
      });

      for (const r of existingRows) {
        if (!subValues.includes(r.rowData[subAttr.name])) {
          await RefModel.updateOne({ _id: r._id }, { status: 'in-active' });
        }
      }

      // Upsert each value
      for (const val of subValues) {
        for (const parentVal of parentValueResolved) {
          await RefModel.updateOne(
            {
              [`rowData.${refFieldName}`]: parentVal,
              [`rowData.${subAttr.name}`]: val,
            },
            {
              $set: {
                [`rowData.${refFieldName}`]: parentVal,
                [`rowData.${subAttr.name}`]: val,
                status: 'active',
                dataSourceId,
                dataSourceVersionId: versionId,
                versionValue,
                organizationId,
                updatedAt: new Date(),
              },
              $setOnInsert: {
                createdBy: userId,
                createdAt: new Date(),
              },
            },
            {
              upsert: true,
              strict: false, // ✅ allows flexible rowData paths
            }
          );

        }
      }
    } else {
      // one_to_one
      const existingRow: any = await RefModel.findById(parentValue);
      if (!existingRow) continue;
      parentValueResolved = existingRow.rowData[refFieldName];

      await RefModel.updateOne(
        {
          [`rowData.${refFieldName}`]: parentValueResolved,
        },
        {
          $set: {
            [`rowData.${refFieldName}`]: parentValueResolved,
            [`rowData.${subAttr.name}`]: subValue,
            status: 'active',
            dataSourceId,
            dataSourceVersionId: versionId,
            versionValue,
            organizationId,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdBy: userId,
            createdAt: new Date(),
          },
        },
        {
          upsert: true,
          strict: false, // ✅ allows flexible rowData fields
        }
      );

    }
  }
}

export const createSingleRowVersionValue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      dataSourceId,
      versionValue,
      rowData,
      isErrorResolved,
      errorDataSourceVersionId,
      errorDataSourceId,
      attributeName,
      fileAttributeValue,
    } = req.body;
    const { userId, organizationId, orgCode } = req.user;

    if (!dataSourceId || !rowData) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const dataSourceDetails = await dataSourceService.findDataSourceById(dataSourceId, true);
    if (!dataSourceDetails) {
      return res.status(404).json({ success: false, message: 'Data source not found.' });
    }

    const versionQuery: any = {
      dataSourceId,
      isCurrent: true,
      ...(versionValue && { versionValue }),
    };

    let version: any = await dataSourceVersionService.getDataSourceVersion({
      query: versionQuery,
      populate: [],
      sort: { createdAt: -1 },
    });
    if (!version) {
      const now = new Date();
      const fallbackVersionValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const newVersionValue = versionValue || fallbackVersionValue;

      version = await dataSourceVersionService.createDataSourceVersion({
        dataSourceId,
        versionValue: newVersionValue,
        isCurrent: true,
        isActive: true,
        createdBy: userId,
        organizationId,
      });
    }

    const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: dataSourceDetails.code,
    });

    const entity = await findEntityById(dataSourceDetails.entityId);
    if (!entity || !entity.attributes) {
      return res.status(400).json({ success: false, message: 'Entity or attributes not found.' });
    }

    await autoPopulateAttributeOptionFromRow({
      entityId: dataSourceDetails.entityId,
      attributes: entity.attributes,
      rowData,
      userId,
      organizationId,
    });

    const { isValid, errors, validatedRowData } = await validateRowData({
      rowData,
      attributes: entity.attributes,
      entityId: dataSourceDetails.entityId,
      dataSourceId,
      dataSourceVersionId: version?._id,
      uniqueAttributeRules: dataSourceDetails.uniqueAttributeRules
    });

    if (!isValid) {
      return res.status(400).json({ success: false, errors });
    }

    const newRow = {
      dataSourceId,
      versionValue: version.versionValue,
      entityId: dataSourceDetails.entityId,
      dataSourceVersionId: version._id,
      rowData: validatedRowData,
      createdBy: userId,
      status: 'active',
    };

    const newRowData = await dataSourceVersionValueService.createDataSourceVersionValue(schemaName, [newRow]);

    // 🔹 Handle reference subfields
    await handleReferenceSubFields({
      rowData: validatedRowData,
      attributes: entity.attributes,
      dataSourceId,
      versionId: version?._id,
      versionValue: version.versionValue,
      userId,
      organizationId,
    });

    if (isErrorResolved) {
      const errorDataSourceDetails = await dataSourceService.findDataSourceById(errorDataSourceId, true);
      const errorSchema = getImportLogSchemaNameBasedOnVersionCodeAndOrgCode({
        orgCode,
        versionCode: errorDataSourceDetails?.code!,
      });

      const refrenceRecords = await dataImportErrorServices.getDataImportErrorRecords({
        dataSourceVersionId: errorDataSourceVersionId,
        attributeName,
        fileAttributeValue,
        // status: 'open',
      });

      const rowNumbersToUpdate = refrenceRecords.map((record) => record.rowNumber);

      console.log('rowNumbersToUpdate', rowNumbersToUpdate);
      await dataImportErrorServices.updateDataImportErrors(
        {
          dataSourceVersionId: errorDataSourceVersionId,
          attributeName,
          fileAttributeValue,
          rowNumber: { $in: rowNumbersToUpdate },
        },
        { status: 'resolved' }
      );

      await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
        errorSchema,
        { dataSourceVersionId: new ObjectId(errorDataSourceVersionId), rowNumber: { $in: rowNumbersToUpdate } },
        { [`rowData.${attributeName}`]: newRowData[0]._id},
        {
          isErrorLog: -1,
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Row created successfully.',
    });
  } catch (e) {
    console.error('Error in createSingleRowVersionValue', e);
    next(e);
  }
};

export const updateSingleRowVersionValue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      dataSourceId,
      versionValue,
      rowData,
      isErrorResolved,
      errorDataSourceVersionId,
      errorDataSourceId,
      attributeName,
      fileAttributeValue,
    } = req.body;

    const { userId, organizationId, orgCode } = req.user;
    const { rowId } = req.params;

    if (!dataSourceId || !rowData || !rowId) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const dataSourceDetails = await dataSourceService.findDataSourceById(dataSourceId, true);
    if (!dataSourceDetails) {
      return res.status(404).json({ success: false, message: 'Data source not found.' });
    }

    const versionQuery: any = {
      dataSourceId,
      isCurrent: true,
      ...(versionValue && { versionValue }),
    };

    let version = await dataSourceVersionService.getDataSourceVersion({
      query: versionQuery,
      populate: [],
      sort: { createdAt: -1 },
    });

    if (!version) {
      return res.status(404).json({ success: false, message: 'Version not found.' });
    }

    const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: dataSourceDetails.code,
    });

    const existingRow = await dataSourceVersionValueService.findOne(schemaName, {
      _id: rowId,
      dataSourceVersionId: version._id,
    });

    if (!existingRow) {
      return res.status(404).json({ success: false, message: 'Row not found for update.' });
    }

    const entity = await findEntityById(dataSourceDetails.entityId);
    if (!entity || !entity.attributes) {
      return res.status(400).json({ success: false, message: 'Entity or attributes not found.' });
    }

    await autoPopulateAttributeOptionFromRow({
      entityId: dataSourceDetails.entityId,
      attributes: entity.attributes,
      rowData,
      userId,
      organizationId,
    });

    const { isValid, errors, validatedRowData } = await validateRowData({
      rowData,
      attributes: entity.attributes,
    });

    if (!isValid) {
      return res.status(400).json({ success: false, errors });
    }

    // ✅ UPDATE
    await dataSourceVersionValueService.updateOne(
      schemaName,
      { _id: rowId },
      {
        rowData: validatedRowData,
        updatedBy: userId,
        status: 'active'
      }
    );

    // 🔹 Handle reference subfields
    await handleReferenceSubFields({
      rowData: validatedRowData,
      attributes: entity.attributes,
      dataSourceId,
      versionId: version?._id,
      versionValue: version.versionValue,
      userId,
      organizationId,
    });

    // 🔥 ADD THIS BLOCK (same as create API)
    if (isErrorResolved) {
      const errorDataSourceDetails = await dataSourceService.findDataSourceById(errorDataSourceId, true);

      const errorSchema = getImportLogSchemaNameBasedOnVersionCodeAndOrgCode({
        orgCode,
        versionCode: errorDataSourceDetails?.code!,
      });

      const refrenceRecords = await dataImportErrorServices.getDataImportErrorRecords({
        dataSourceVersionId: errorDataSourceVersionId,
        attributeName,
        fileAttributeValue,
      });

      const rowNumbersToUpdate = refrenceRecords.map((record) => record.rowNumber);

      await dataImportErrorServices.updateDataImportErrors(
        {
          dataSourceVersionId: errorDataSourceVersionId,
          attributeName,
          fileAttributeValue,
          rowNumber: { $in: rowNumbersToUpdate },
        },
        { status: 'resolved' }
      );

      await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
        errorSchema,
        {
          dataSourceVersionId: new ObjectId(errorDataSourceVersionId),
          rowNumber: { $in: rowNumbersToUpdate }
        },
        {
          [`rowData.${attributeName}`]: rowId, // 🔥 important difference from create
        },
        {
          isErrorLog: -1,
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Row updated successfully.',
    });

  } catch (e) {
    console.error('Error in updateSingleRowVersionValue', e);
    next(e);
  }
};

export const deleteMultipleRowsFromVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dataSourceId, versionValue, ids } = req.body;
    const { orgCode } = req.user;

    if (!dataSourceId || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing or invalid input.' });
    }

    const dataSourceDetails = await dataSourceService.findDataSourceById(dataSourceId, true);
    if (!dataSourceDetails) {
      return res.status(404).json({ success: false, message: 'Data source not found.' });
    }

    const versionQuery: any = {
      dataSourceId,
      isCurrent: true,
    };

    if (versionValue) {
      versionQuery.versionValue = versionValue;
    }

    const versionDetails = await dataSourceVersionService.getDataSourceVersion({
      query: versionQuery,
      populate: [],
      sort: { createdAt: -1 },
    });

    if (!versionDetails) {
      return res.status(404).json({ success: false, message: 'Version not found.' });
    }

    const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: dataSourceDetails.code,
    });
    await dataSourceVersionValueService.deleteVersionValues(schemaName, {
      _id: { $in: ids.map((id: string) => new Types.ObjectId(id)) },
      // dataSourceVersionId: versionDetails._id,
    });

    return res.status(200).json({
      success: true,
      message: 'Rows deleted successfully.',
    });
  } catch (e) {
    console.log('Error in deleteMultipleRowsFromVersion', e);
    next(e);
  }
};

export const getLatestDataSourceVersionDetailBasedOnCustomReportIdAndVersionValue = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { customReportId } = req.params;
    const { userId, organizationId, orgCode } = req?.user;

    // const { search, paginate = 'false' } = req.query;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const result = await dataSourceVersionService.getDataSourceVersionGroupedList({
      match: {
        customReportId: new ObjectId(customReportId),
        reportRequestId: { $exists: true, $ne: '' },
        organizationId: new ObjectId(organizationId),
        isCurrent: true,
      },
      groupBy: 'reportRequestId',
      page,
      limit,
      sort: { versionValue: -1 },

      populate: [
        {
          from: 'custom_reports',
          localField: 'customReportId',
          foreignField: '_id',
          as: 'customReportId',
          isSingle: true,
        },
        {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy',
          isSingle: true,
        },
        {
          from: 'report_requests',
          localField: 'reportRequestId',
          foreignField: '_id',
          as: 'reportRequest', // No need for extra nesting here
          isSingle: false, // Assuming dataSourceVersion is an array
        },
      ],

      selectFields: {
        _id: '$reportRequestId', // Keep the reportRequestId as _id
        versionValue: 1,
        'customReportId.reportName': 1,
        'customReportId._id': 1,
        'createdBy.firstName': 1,
        'createdBy.lastName': 1,
        'dataSourceVersion.sheetName': 1,
        'dataSourceVersion.sheetCode': 1,
        'dataSourceVersion.tabName': 1,
        'dataSourceVersion.mappingFuctionName': 1,
        'dataSourceVersion.designCode': 1,
        'dataSourceVersion.versionCode': 1,
        'dataSourceVersion.dataSourceId': 1,
        'dataSourceVersion.dataSourceVersionId': 1,
        'dataSourceVersion.allowPdfDownload': 1,
        createdAt: 1,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'The available version data has been successfully retrieved.',
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (e) {
    console.log('Error in getLatestDataSourceVersionDetailBasedOnCustomReportIdAndVersionValue.', e);
    next(e);
  }
};

export const listAllAvailableDataSourceVersionValue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req?.user;
    // const { search, paginate = 'false' } = req.query;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const result = await dataSourceVersionService.getDataSourceVersionListAdvanceFunction({
      match: {
        organizationId,
        isCurrent: true,
        isActive: true,
      },
      page,
      limit,
      sort: { versionValue: -1 },
      group: {
        _id: '$versionValue',
        count: { $sum: 1 },
      },
      select: 'versionValue',
    });

    return res.status(200).json({
      success: true,
      message: 'The available data source version has been successfully retrieved.',
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (e) {
    console.log('Error in listAllAvailableDataSourceVersionValue.', e);
    next(e);
  }
};

// export const getNewChartData = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { dataSourceId, filters, versionValue, dimensions, groupBy, aggregation, conditions, widgetType } = req.body;

//     const { orgCode } = req.user;

//     const dataSourceDetails = await dataSourceService.findDataSourceById(dataSourceId, true);
//     if (!dataSourceDetails) {
//       return res.status(404).json({ success: false, message: 'Data source not found.' });
//     }

//     const versionQuery: any = {
//       dataSourceId: new Types.ObjectId(dataSourceId),
//       isCurrent: true, // Always filter for current version
//     };

//     if (versionValue) {
//       versionQuery.versionValue = versionValue; // Optional, narrows to specific version if provided
//     }

//     const dataSourceVersionDetails = await dataSourceVersionService.getDataSourceVersionList({
//       query: versionQuery,
//     });

//     if (!dataSourceVersionDetails?.data?.length) {
//       return res.status(200).json({
//         success: true,
//         message: 'Version data has been successfully retrieved.',
//         data: [],
//         totalCount: 0,
//       });
//     }

//     const dataSourceVersionId = dataSourceVersionDetails.data[0]._id;
//     const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
//       orgCode,
//       versionCode: dataSourceDetails.code,
//     });

//     const query = { dataSourceVersionId };

//     const result = await dataSourceVersionValueService.getDataSourceVersionValueV2({
//       schemaName,
//       query,
//       filters,
//       entityId: dataSourceDetails.entityId,
//       dimension: dimensions,
//       groupBy,
//       aggregation,
//       conditions,
//       widgetType,
//     });
//     const data = result ?? [];

//     return res.status(200).json({
//       success: true,
//       message: 'Chart data has been successfully retrieved.',
//       data,
//     });
//   } catch (e) {
//     console.log('Error in getNotivixChartData:', e);
//     next(e);
//   }
// };

export const getDataSourceVersionDetailsBasedOnId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dataSourceVersionId } = req.params;

    const result = await dataSourceVersionService.getDataSourceVersionDetailBasedOnId({
      _id: new Types.ObjectId(dataSourceVersionId),
    });

    res.status(200).json({
      success: true,
      message: 'Data Source Version Details Fetched Successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getMasterDataListFromDataSource = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { dataSourceId, fields } = req.body;

    if (!dataSourceId) {
      return res.status(400).json({
        success: false,
        message: "dataSourceId is required",
      });
    }

    const result =
      await dataSourceVersionValueService.getMasterDataFromDataSource({
        dataSourceId,
        fields,
        user: req.user,
      });

    res.status(200).json({
      success: true,
      message: "Master Data List Fetched Successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
