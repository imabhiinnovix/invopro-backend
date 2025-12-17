import { Types } from 'mongoose';
import { getEntityFieldOptions } from '../database/services/common/entity.services';
import { findDerivedFieldById } from '../database/services/common/derivedField.services';
const crypto = require('crypto');
import dayjs from "dayjs";


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

/**
 * Filters rowData to only mapped fields and renames them
 */
export async function transformRowDataWithLabels(
  rowData: Record<string, any>,
  dataSourceDetails: any
): Promise<Record<string, any>> {
  const labelMap = await getLabelByMappedAttributeName(dataSourceDetails);

  const transformed: Record<string, any> = {};

  for (const mappedAttr in labelMap) {
    if (!labelMap.hasOwnProperty(mappedAttr)) continue;

    const value = rowData[mappedAttr]; // direct lookup
    if (value !== undefined) {
      const label = labelMap[mappedAttr];

      if (Array.isArray(value)) {
        if (value.length === 1) {
          transformed[label] = value[0]; // unwrap single element
        } else if (value.length > 1) {
          transformed[label] = value.join(" | "); // join with pipe
        } else {
          transformed[label] = ""; // empty array → empty string
        }
      } else {
        transformed[label] = value;
      }
    }
  }

  return transformed;
}

/**
 * Create a MongoDB condition object from an array of simple filter conditions.
 *
 * Each condition should have:
 * {
 *   field: string,
 *   operator: string,
 *   value?: any
 * }
 */
export async function createMongoCondition(conditions: any[] = []): Promise<Record<string, any>> {
  if (!Array.isArray(conditions) || conditions.length === 0) return {};

  // Escape special regex characters
  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const trimValues = (values: any): string[] => {
    if (!values) return [];
    if (!Array.isArray(values)) values = [values];
    return values
      .flatMap((v) => (typeof v === "string" && v.includes(",") ? v.split(",") : v))
      .map((v) => (typeof v === "string" ? v.trim() : v))
      .filter((v) => v !== "");
  };

  const buildRegexOr = (field: string, values: string[], negate = false) => {
    if (values.length === 1) {
      return negate
        ? { [field]: { $not: { $regex: `^${escapeRegExp(values[0])}$`, $options: "i" } } }
        : { [field]: { $regex: `^${escapeRegExp(values[0])}$`, $options: "i" } };
    }
    const orConditions = values.map((v) => ({
      [field]: negate
        ? { $not: { $regex: `^${escapeRegExp(v)}$`, $options: "i" } }
        : { $regex: `^${escapeRegExp(v)}$`, $options: "i" },
    }));
    return negate ? { $and: orConditions } : { $or: orConditions };
  };

  const now = new Date();
  const getTargetDate = (offset: number, timeUnit: string, reverse = false): Date => {
    const multiplier =
      timeUnit === "d" ? 86400000 : timeUnit === "h" ? 3600000 : 1000; // days, hours, seconds
    const sign = reverse ? -1 : 1;
    return new Date(now.getTime() + offset * multiplier * sign);
  };

  const allConditions: any[] = [];

  for (const cond of conditions) {
    const { field, operator, value, timeUnit } = cond;
    if (!field) continue;

    const trimmedValues = trimValues(value);
    let mongoCond: any = {};

    switch (operator) {
      case "eq":
        mongoCond = buildRegexOr(field, trimmedValues, false);
        break;

      case "ne":
        mongoCond = buildRegexOr(field, trimmedValues, true);
        break;

      case "contains":
        mongoCond = { [field]: { $regex: escapeRegExp(value), $options: "i" } };
        break;

      case "notcontains":
        mongoCond = { [field]: { $not: { $regex: escapeRegExp(value), $options: "i" } } };
        break;

      case "startswith":
        mongoCond = { [field]: { $regex: `^${escapeRegExp(value)}`, $options: "i" } };
        break;

      case "endswith":
        mongoCond = { [field]: { $regex: `${escapeRegExp(value)}$`, $options: "i" } };
        break;

      case "blank":
        mongoCond = { [field]: { $in: [null, ""] } };
        break;

      case "notblank":
        mongoCond = { [field]: { $nin: [null, ""] } };
        break;

      case "before":
        mongoCond = { [field]: { $lt: getTargetDate(Number(value), timeUnit || "d") } };
        break;

      case "after":
        mongoCond = { [field]: { $gt: getTargetDate(Number(value), timeUnit || "d") } };
        break;

      case "on":
        mongoCond = {
          [field]: {
            $gte: new Date(value),
            $lt: new Date(new Date(value).getTime() + 86400000),
          },
        };
        break;

      case "noton":
        mongoCond = {
          [field]: {
            $not: {
              $gte: new Date(value),
              $lt: new Date(new Date(value).getTime() + 86400000),
            },
          },
        };
        break;

      case "onOrBeforeToday": {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        mongoCond = { [field]: { $lte: today } };
        break;
      }

      case "onOrAfterToday": {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        mongoCond = { [field]: { $gte: today } };
        break;
      }

      case "afterToday": {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        mongoCond = { [field]: { $gt: today } };
        break;
      }

      case "beforeToday": {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        mongoCond = { [field]: { $lt: today } };
        break;
      }

      default:
        mongoCond = { [field]: value };
    }

    allConditions.push(mongoCond);
  }

  // Combine using $and
  const finalCondition =
    allConditions.length > 1 ? { $and: allConditions } : allConditions[0] || {};

  return finalCondition;
}


export const formatDateValue = (value: any) => {
  if (!value) return "";

  const d = dayjs(value);
  if (!d.isValid()) return "";

  return d.format("DD-MMM-YYYY"); // → 21-Aug-2025
};

export const formatDateTime = (value: any) => {
  if (!value) return "";

  const d = dayjs(value);
  if (!d.isValid()) return "";

  return d.format("DD MMM YYYY HH:mm:ss [UTC]"); // → 21-Aug-2025
};


// sanitize code -> remove all special characters & spaces
export const sanitizeCode = (str) => {
  return str.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
};

export const matchesMultiOption = (value: string | string[], allowed: string[]) => {
  if (!value) return false;
  if (typeof value === 'string') return allowed.includes(value);
  return value.some((v) => allowed.includes(v));
};

export const formatExcelCellValue = (value: any): string | number => {
  if (value === null || value === undefined) return '';

  // Multi-option attribute
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  // Object (safety fallback)
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return value;
};






