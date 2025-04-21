/**
 * This file contains common field operator handlers for MongoDB queries
 * It provides functions to handle different types of field operators
 */

/**
 * Interface for condition with field and operator
 */
export interface FieldCondition {
  field: string;
  operator: string;
  value?: unknown;
}

/**
 * Type for MongoDB match conditions object
 */
export type MatchConditions = Record<string, unknown>;

/**
 * Handles number operator conditions
 */
export const handleNumberOperators = (
  condition: FieldCondition,
  convertedValue: number | null,
  fieldPath: string,
  matchConditions: MatchConditions
) => {
  const fieldName = `rowData.${condition.field}`;

  switch (condition.operator) {
    case 'eq':
      matchConditions[fieldName] = convertedValue;
      break;
    case 'lt':
    case 'lte':
    case 'gt':
    case 'gte':
    case 'ne':
      matchConditions[fieldName] = { [`$${condition.operator}`]: convertedValue };
      break;
    case 'blank':
      matchConditions[fieldName] = null;
      break;
    case 'notblank':
      matchConditions[fieldName] = { $ne: null };
      break;
    default:
      console.warn(`Unsupported number operator: ${condition.operator}`);
      break;
  }
};

/**
 * Handles string operator conditions
 */
export const handleStringOperators = (
  condition: FieldCondition,
  convertedValue: string | null,
  fieldPath: string,
  matchConditions: MatchConditions
) => {
  const fieldName = `rowData.${condition.field}`;

  switch (condition.operator) {
    case 'eq':
      matchConditions[fieldName] = convertedValue;
      break;
    case 'ne':
      matchConditions[fieldName] = { $ne: convertedValue };
      break;
    case 'contains':
      matchConditions[fieldName] = { $regex: convertedValue, $options: 'i' };
      break;
    case 'notcontains':
      matchConditions[fieldName] = { $not: { $regex: convertedValue, $options: 'i' } };
      break;
    case 'startswith':
      matchConditions[fieldName] = { $regex: `^${convertedValue}`, $options: 'i' };
      break;
    case 'endswith':
      matchConditions[fieldName] = { $regex: `${convertedValue}$`, $options: 'i' };
      break;
    case 'blank':
      matchConditions[fieldName] = null;
      break;
    case 'notblank':
      matchConditions[fieldName] = { $ne: null };
      break;
    default:
      console.warn(`Unsupported string operator: ${condition.operator}`);
      break;
  }
};

/**
 * Handles date operator conditions
 */
export const handleDateOperators = (
  condition: FieldCondition,
  convertedValue: Date | null,
  fieldPath: string,
  matchConditions: MatchConditions
) => {
  const fieldName = `rowData.${condition.field}`;

  switch (condition.operator) {
    case 'before':
      matchConditions[fieldName] = { $lt: convertedValue };
      break;
    case 'after':
      matchConditions[fieldName] = { $gt: convertedValue };
      break;
    case 'on':
    case 'noton': {
      if (convertedValue === null) {
        matchConditions[fieldName] = null;
        break;
      }
      const startOfDay = new Date(convertedValue);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(convertedValue);
      endOfDay.setUTCHours(23, 59, 59, 999);
      matchConditions[fieldName] =
        condition.operator === 'on'
          ? { $gte: startOfDay, $lt: endOfDay }
          : { $not: { $gte: startOfDay, $lt: endOfDay } };
      break;
    }
    case 'blank':
      matchConditions[fieldName] = null;
      break;
    case 'notblank':
      matchConditions[fieldName] = { $ne: null };
      break;
    default:
      console.warn(`Unsupported date operator: ${condition.operator}`);
      break;
  }
};

/**
 * Handles boolean operator conditions
 */
export const handleBooleanOperators = (
  condition: FieldCondition,
  convertedValue: boolean | null,
  fieldPath: string,
  matchConditions: MatchConditions
) => {
  const fieldName = `rowData.${condition.field}`;

  switch (condition.operator) {
    case 'eq':
      matchConditions[fieldName] = convertedValue;
      break;
    case 'ne':
      matchConditions[fieldName] = { $ne: convertedValue };
      break;
    case 'blank':
      matchConditions[fieldName] = null;
      break;
    case 'notblank':
      matchConditions[fieldName] = { $ne: null };
      break;
    default:
      console.warn(`Unsupported boolean operator: ${condition.operator}`);
      break;
  }
};

/**
 * Handles default operator conditions for other field types
 */
export const handleDefaultOperators = (
  condition: FieldCondition,
  convertedValue: unknown,
  fieldPath: string,
  matchConditions: MatchConditions
) => {
  const fieldName = `rowData.${condition.field}`;

  switch (condition.operator) {
    case 'eq':
      matchConditions[fieldName] = convertedValue;
      break;
    case 'ne':
      matchConditions[fieldName] = { $ne: convertedValue };
      break;
    case 'blank':
      matchConditions[fieldName] = null;
      break;
    case 'notblank':
      matchConditions[fieldName] = { $ne: null };
      break;
    default:
      console.warn(`Unsupported operator: ${condition.operator}`);
      break;
  }
};
