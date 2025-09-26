import { Types } from 'mongoose';
import { getEntityFieldOptions } from '../database/services/common/entity.services';
import { findDerivedFieldById } from '../database/services/common/derivedField.services';
const crypto = require('crypto');

export function getSchemaNameBasedOnVersionCodeAndOrgCode({
  orgCode,
  versionCode,
}: {
  orgCode: string;
  versionCode: string;
}) {
  return `data_${orgCode}_${versionCode}`;
}

export function getImportLogSchemaNameBasedOnVersionCodeAndOrgCode({
  orgCode,
  versionCode,
}: {
  orgCode: string;
  versionCode: string;
}) {
  return `data_${orgCode}_import_log_${versionCode}`;
}

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function arraysAreEqual(a?: (string | Types.ObjectId)[], b?: (string | Types.ObjectId)[]): boolean {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;

  const sortedA = a.map(String).sort();
  const sortedB = b.map(String).sort();

  return sortedA.every((val, index) => val === sortedB[index]);
}

export const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

export const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');


export function uniqueCode(length = 20) {
  return crypto
    .randomBytes(Math.ceil(length * 0.75)) // enough entropy for desired length
    .toString('base64')                    // convert to base64
    .replace(/[+/=]/g, '')                 // make it URL/file-name safe
    .slice(0, length);                     // trim to exact length
}


/**
 * Checks if at least one fieldSetting in a dataSource has a non-empty refAttributeId.
 *
 * @param dataSource - The DataSource document or plain object
 * @returns true if any field has a non-empty refAttributeId, otherwise false
 */
export async function checkReferenceFieldExist(dataSource: Record <string, any>): Promise <boolean> {
  if (!dataSource?.fieldSettings || dataSource.fieldSettings.length === 0) {
    return false;
  }

  return dataSource.fieldSettings.some(
    (field) => Array.isArray(field.refAttributeId) && field.refAttributeId.length > 0
  );
}


/**
 * Build map of mappedAttributeName -> label for a given DataSource
 */
export async function getLabelByMappedAttributeName(dataSourceDetails: any) {
  const result: Record<string, string> = {};

  if (!dataSourceDetails?.entityId?._id || !Array.isArray(dataSourceDetails?.fieldSettings)) {
    return result;
  }

  // 1. Load field options for this entity
  const fieldOptions = await getEntityFieldOptions(
    dataSourceDetails.entityId._id.toString()
  );

  // 2. Iterate through fieldSettings
  for (const field of dataSourceDetails.fieldSettings) {
    let mappedAttributeName: string | undefined;

    // Derived field
    if (field.isDerived && field.attributeId) {
      const derived = await findDerivedFieldById(field.attributeId);
      if (derived) {
        mappedAttributeName = `Derived.${derived.name}`;
      }
    } else {
      // Normal field → match with entityFieldOptions
      const match = fieldOptions.find(
        (opt: any) =>
          String(opt.value.attributeId) === String(field.attributeId) &&
          JSON.stringify(opt.value.refAttributeId || []) ===
            JSON.stringify(field.refAttributeId || [])
      );

      if (match) {
        mappedAttributeName = match.label;
      } else {
        mappedAttributeName = "Unknown";
      }
    }

    // 3. Add to result map (only if label exists)
    if (mappedAttributeName && field.label) {
      result[mappedAttributeName] = field.label;
    }
  }

  return result;
}


