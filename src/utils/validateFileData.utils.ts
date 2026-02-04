/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Types } from 'mongoose';
import { escapeRegExp } from './common.utils';
import { excelDateToJSDate } from './excel.utils';
import * as attributeOptionService from '../database/services/common/attributeOption.services';
import { getEntityAttribute, getModelForEntity } from './entity.utils';
import * as dataSourceService from '../database/services/common/dataSource.services';


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
    const convertedValue = value !== undefined && value !== null ? String(value) : null;
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

export async function validateFileData({
  fileData,
  attributes,
  mapping,
  separator,
  dataSourceId,
  entityId,
  dataSourceVersionId,
  centralFileId,
  versionValue,
  uniqueAttributeRules = [],
}: {
  fileData: any[];
  attributes: any[];
  mapping: Record<string, string>;
  separator: Record<string, string>;
  dataSourceId: string;
  entityId: any;
  dataSourceVersionId?: string;
  centralFileId?: string;
  versionValue: string;
  uniqueAttributeRules?: Types.ObjectId[][];
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

  for (const [index, row] of fileData.entries()) {
    console.log('Processing Index:', index);
    const parts = row.fileRowNumber.split(':');
    const rowNum = parts.pop(); // last part → row number
    const fileName = parts.join(':');
    const newRow = {
      dataSourceId,
      entityId,
      dataSourceVersionId,
      centralFileId,
      versionValue,
      rowData: {},
      isErrorLog: 0,
      rowNumber: index + 1,
    };

    // track temporary __display keys for cleanup later
    // const tempDisplayAttrs: string[] = [];

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

      if (
        (attr.required === 'Mandatory' || attr.required === true) &&
        (value === undefined || value === null || value === '')
      ) {
        errors.push({
          entityId,
          dataSourceId,
          dataSourceVersionId,
          centralFileId,
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
      } 
      else if (value !== undefined && value != null && value) {
        // if (
        //   attr.referenceEntitySetting?.refEntityId &&
        //   ['one_to_one', 'many_to_one'].includes(attr.referenceEntitySetting?.relationType)
        // ) {
        //   const refEntityId = attr.referenceEntitySetting.refEntityId;
        //   const refEntityFieldId = attr.referenceEntitySetting.refEntityField;

        //   // const refEntityField = await getEntityAttribute(refEntityId, refEntityFieldId);
        //   // const RefModel = await getModelForEntity(refEntityId);
        //   const { field: refEntityField, model: RefModel } = await getRefMeta(refEntityId, refEntityFieldId);

        //   // const escapedValue = escapeRegExp(value.trim());
        //   // const regex = new RegExp(`^${escapedValue}$`, 'i');

        //   // const referencedDoc: any = await RefModel.findOne({
        //   //   [`rowData.${refEntityField.name}`]: regex,
        //   //   'status': 'active'
        //   // });
        //   const referencedDoc = await resolveReference(
        //                       refEntityId,
        //                       // refEntityFieldId,
        //                       value,
        //                       refEntityField,
        //                       RefModel
        //                     );


        //   if (!referencedDoc) {
        //     const refDataSourceDetails = await dataSourceService.findDataSourcesByEntityId(refEntityId);
        //     errors.push({
        //       entityId,
        //       dataSourceId,
        //       dataSourceVersionId,
        //       centralFileId,
        //       rowNumber: index + 1,
        //       fileAttributeName: Array.isArray(fileKey) ? fileKey.join('|') : fileKey,
        //       fileAttributeValue: value,
        //       attributeName: attrName,
        //       attributeType: attr.type,
        //       refEntityId,
        //       refAttributeId: refEntityFieldId,
        //       refDataSourceId: refDataSourceDetails?.[0]?._id,
        //       errorType: ERROR_CODES.INVALID_REFERENCE.type,
        //       errorCode: ERROR_CODES.INVALID_REFERENCE.code,
        //       fileRowNumber: rowNum,
        //       fileName,
        //       status: 'open',
        //       errorMessage: `${attrName}- ${value} not found.`,
        //     });
        //     newRow.isErrorLog = newRow.isErrorLog ? newRow.isErrorLog + 1 : 1;
        //   } else {
        //     newRow.rowData[attrName] = referencedDoc._id;
        //     newRow.rowData[`${attrName}__display`] = referencedDoc.rowData?.[refEntityField.name];
        //     tempDisplayAttrs.push(`${attrName}__display`); // ✅ track for cleanup
        //   }
        // } 
        // else {
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
                centralFileId,
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
                centralFileId,
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
        // }
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
              centralFileId,
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
    // for (const tempKey of tempDisplayAttrs) {
    //   delete newRow.rowData[tempKey];
    // }

    newRowData.push(newRow);
  }

  return {
    errors,
    newRowData,
  };
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
  model: any
) {
  // 1️⃣ get metadata (cached)
  // const { field, model } = await getRefMeta(refEntityId, refEntityFieldId);

  // 2️⃣ value cache key
  const cacheKey = `${refEntityId}:${field.name}:${value.trim().toLowerCase()}`;

  if (refValueCache.has(cacheKey)) {
    return refValueCache.get(cacheKey);
  }

  // 3️⃣ exact regex (bracket-safe)
  const regex = getExactRegex(value);

  const doc =
    (await model.findOne({
      [`rowData.${field.name}`]: regex,
      status: 'active',
    })) || null;

  refValueCache.set(cacheKey, doc);
  return doc;
}