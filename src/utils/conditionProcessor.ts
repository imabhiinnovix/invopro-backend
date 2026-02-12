/* eslint-disable @typescript-eslint/no-explicit-any */
import { isValidOperatorForFieldType, doesOperatorRequireValue } from './fieldOperators';
import {
  handleNumberOperators,
  handleStringOperators,
  handleDateOperators,
  handleBooleanOperators,
  handleDefaultOperators,
} from './fieldOperatorHandlers';

/**
 * Process field conditions and build matchConditions for MongoDB aggregation
 * Used across multiple places in the codebase for consistent condition processing
 */
export const processFieldConditions = (
  conditionsByField: Record<string, any[]>,
  getFieldType: (fieldName: string) => string,
  initialMatchConditions: Record<string, any> = {}
) => {
  const dateConversions = {};
  const matchConditions = { ...initialMatchConditions };

  // Helper function to get field path
  const getFieldPath = (fieldName: string) => {
    return `$${fieldName}`;
  };

  // Converts to ISO only when valid; else returns original
const safeConvertToISOString = (value: any) => {
  const d = new Date(value);
  return !isNaN(d.getTime()) ? d.toISOString() : value;
};
const safeDate = (value: any) => {
  const d = new Date(value);
  return !isNaN(d.getTime()) ? d : value;
};

function safeDateString(fieldPath) {
  return {
    $cond: {
      if: {
        $or: [
          { $eq: [fieldPath, null] },
          { $eq: [fieldPath, ""] }
        ]
      },
      then: null,
      else: {
        $dateFromString: { 
          dateString: fieldPath,
          format: "%Y-%m-%dT%H:%M:%S.%LZ"
         },
        
      }
    }
  };
}




  // Process each field's conditions
  Object.entries(conditionsByField).forEach(([field, conditions]) => {
    const fieldType = getFieldType(field);
    const fieldPath = getFieldPath(`rowData.${field}`);
    const fieldName = `rowData.${field}`;


     // ============================================================
    //  MINIMAL CHANGE: MULTIPLE DATE CONDITIONS (AND + blank/notblank)
    // ============================================================
    if ((fieldType === 'date' || fieldType === 'date-range') && conditions.length > 1) {
      const convertedField = `converted_${field}`;

      dateConversions[convertedField] = {
        $cond: {
          if: { $eq: [{ $type: fieldPath }, 'date'] },
          then: fieldPath,
          else: safeDateString(fieldPath),
        },
      };

      const andConditions: any[] = [];

      conditions.forEach((condition) => {
        const convertedValue = safeDate(condition.value);

        switch (condition.operator) {
          case 'before':
            andConditions.push({ [convertedField]: { $lt: convertedValue } });
            break;

          case 'after':
            andConditions.push({ [convertedField]: { $gt: convertedValue } });
            break;

          case 'on': {
            const startOfDay = new Date(convertedValue);
            startOfDay.setUTCHours(0, 0, 0, 0);
            const endOfDay = new Date(convertedValue);
            endOfDay.setUTCHours(23, 59, 59, 999);
            andConditions.push({
              [convertedField]: { $gte: startOfDay, $lt: endOfDay },
            });
            break;
          }

          case 'noton': {
            const startOfDay = new Date(convertedValue);
            startOfDay.setUTCHours(0, 0, 0, 0);
            const endOfDay = new Date(convertedValue);
            endOfDay.setUTCHours(23, 59, 59, 999);
            andConditions.push({
              [convertedField]: { $not: { $gte: startOfDay, $lt: endOfDay } },
            });
            break;
          }

          case 'blank':
            andConditions.push({ [convertedField]: null });
            break;

          case 'notblank':
            andConditions.push({ [convertedField]: { $ne: null } });
            break;
        }
      });

      if(andConditions.length > 0){
        if (andConditions.length === 1) {
          Object.assign(matchConditions, andConditions[0]);
        } else if (andConditions.length > 1) {
          matchConditions.$and = matchConditions.$and || [];
          matchConditions.$and.push(...andConditions);
        }
         return;
      }
  }


    // ============================================================
    // EXISTING SINGLE CONDITION LOGIC (UNCHANGED)
    // ============================================================


    // If there's only one condition for this field, process it normally
    if (conditions.length === 1) {
      const condition = conditions[0];

      // Validate if the operator is valid for the field type
      if (!isValidOperatorForFieldType(fieldType, condition.operator)) {
        console.warn(`Operator ${condition.operator} is not valid for field type ${fieldType}`);
        return;
      }

      // Check if the operator requires a value and if it's provided
      if (doesOperatorRequireValue(fieldType, condition.operator) && condition.value === undefined) {
        console.warn(`Operator ${condition.operator} requires a value but none was provided`);
        return;
      }

      if (condition.operator === 'between' && condition.value?.startDate && condition.value?.endDate) {
        const convertedField = `converted_${condition.field}`;

        // Handle date conversion based on field type
        if (fieldType === 'date' || fieldType === 'date-range') {
          dateConversions[convertedField] = {
            $cond: {
              if: { $eq: [{ $type: fieldPath }, 'date'] },
              then: fieldPath,
              else: safeDateString(fieldPath)
            },
          };
        } else {
          dateConversions[convertedField] = safeDateString(fieldPath);
        }

        matchConditions[convertedField] = {
          $gt: new Date(condition.value.startDate),
          $lt: new Date(condition.value.endDate),
        };
      } else if ((fieldType === 'date' || fieldType === 'date-range') && ['on', 'noton', 'before', 'after'].includes(condition.operator)) {
        // Add date conversion for date fields with date-specific operators
        const convertedField = `converted_${condition.field}`;
        dateConversions[convertedField] = {
          $cond: {
            if: { $eq: [{ $type: fieldPath }, 'date'] },
            then: fieldPath,
            else: safeDateString(fieldPath)
          },
        };

        // Convert value to Date
        // const convertedValue = new Date(condition.value);
          const convertedValue = safeDate(condition.value);

        // Handle date operators with the converted field
        switch (condition.operator) {
          case 'before':
            matchConditions[convertedField] = { $lt: convertedValue };
            break;
          case 'after':
            matchConditions[convertedField] = { $gt: convertedValue };
            break;
          case 'on':
          case 'noton': {
            const startOfDay = new Date(convertedValue);
            startOfDay.setUTCHours(0, 0, 0, 0);
            const endOfDay = new Date(convertedValue);
            endOfDay.setUTCHours(23, 59, 59, 999);
            matchConditions[convertedField] =
              condition.operator === 'on'
                ? { $gte: startOfDay, $lt: endOfDay }
                : { $not: { $gte: startOfDay, $lt: endOfDay } };
            break;
          }
        }
      } else {
        // Convert value based on field type
        let convertedValue = condition.value;
        if (fieldType === 'number') {
          convertedValue = Number(condition.value);
        } else if (fieldType === 'date' || fieldType === 'date-range') {
          convertedValue = safeDate(condition.value);
        } else if (fieldType === 'boolean') {
          convertedValue = condition.value === 'true';
        }

        // Handle operators based on field type
        switch (fieldType) {
          case 'number':
            handleNumberOperators(condition, convertedValue, fieldPath, matchConditions);
            break;
          case 'string':
          case 'text':
          case 'option':
          case 'multioption':
          case 'text-with-option':  
            handleStringOperators(condition, convertedValue, fieldPath, matchConditions);
            break;
          case 'date':
          case 'date-range':
            handleDateOperators(condition, convertedValue, fieldPath, matchConditions);
            break;
          case 'boolean':
            handleBooleanOperators(condition, convertedValue, fieldPath, matchConditions);
            break;
          default:
            handleDefaultOperators(condition, convertedValue, fieldPath, matchConditions);
            break;
        }
      }
    } else {
      // Handle multiple conditions for the same field
      // Check if we have numeric range conditions (lt, gt, etc.)
      const hasNumericRange = conditions.some(
        (c) => fieldType === 'number' && ['lt', 'lte', 'gt', 'gte'].includes(c.operator)
      );

      if (hasNumericRange) {
        // For numeric ranges, we need to combine conditions with $and
        const numericConditions = {};

        conditions.forEach((condition) => {
          if (['lt', 'lte', 'gt', 'gte'].includes(condition.operator)) {
            const convertedValue = Number(condition.value);
            if (!numericConditions[fieldName]) {
              numericConditions[fieldName] = {};
            }
            numericConditions[fieldName][`$${condition.operator}`] = convertedValue;
          }
        });

        // Add the combined numeric conditions to matchConditions
        if (Object.keys(numericConditions).length > 0) {
          matchConditions[fieldName] = numericConditions[fieldName];
        }

        // Handle any remaining non-numeric conditions with $or
        const nonNumericConditions = conditions.filter((c) => !['lt', 'lte', 'gt', 'gte'].includes(c.operator));

        if (nonNumericConditions.length > 0) {
          const orConditions = nonNumericConditions
            .map((condition) => {
              const convertedValue =
                fieldType === 'number'
                  ? Number(condition.value)
                  : fieldType === 'date' || fieldType === 'date-range'
                    ? new Date(condition.value)
                    : fieldType === 'boolean'
                      ? condition.value === 'true'
                      : condition.value;

              const conditionObj = {};
              switch (condition.operator) {
                case 'eq':
                  conditionObj[fieldName] = convertedValue;
                  break;
                case 'ne':
                  conditionObj[fieldName] = { $ne: convertedValue };
                  break;
                case 'contains':
                  conditionObj[fieldName] = {
                    $regex: convertedValue,
                    $options: 'i',
                  };
                  break;
                case 'notcontains':
                  conditionObj[fieldName] = {
                    $not: { $regex: convertedValue, $options: 'i' },
                  };
                  break;
                case 'startswith':
                  conditionObj[fieldName] = {
                    $regex: `^${convertedValue}`,
                    $options: 'i',
                  };
                  break;
                case 'endswith':
                  conditionObj[fieldName] = {
                    $regex: `${convertedValue}$`,
                    $options: 'i',
                  };
                  break;
                case 'blank':
                  conditionObj[fieldName] = null;
                  break;
                case 'notblank':
                  conditionObj[fieldName] = { $ne: null };
                  break;
                default:
                  console.warn(`Unsupported operator  123: ${condition.operator}`);
                  return null;
              }
              return Object.keys(conditionObj).length > 0 ? conditionObj : null;
            })
            .filter(Boolean);

          if (orConditions.length > 0) {
            // Only create/modify $or array if we have valid conditions
            if (!matchConditions.$or) {
              matchConditions.$or = [];
            }
            matchConditions.$or.push(...orConditions);

            // Filter out any empty objects that might have slipped through
            if (matchConditions.$or.length > 0) {
              matchConditions.$or = matchConditions.$or.filter(
                (condition) => condition && Object.keys(condition).length > 0
              );
            }
          }
        }
      } else {
        // Handle multiple non-numeric conditions for the same field using $or
        const orConditions = conditions
          .map((condition) => {
            const convertedValue =
              fieldType === 'number'
                ? Number(condition.value)
                : fieldType === 'date' || fieldType === 'date-range'
                  ? safeConvertToISOString(condition.value)
                  : fieldType === 'boolean'
                    ? condition.value === 'true'
                    : condition.value;

            const conditionObj: Record<string, any> = {};

            switch (condition.operator) {
              case 'eq':
                conditionObj[fieldName] = convertedValue;
                break;
              case 'ne':
                conditionObj[fieldName] = { $ne: convertedValue };
                break;
              case 'contains':
                conditionObj[fieldName] = {
                  $regex: convertedValue,
                  $options: 'i',
                };
                break;
              case 'notcontains':
                conditionObj[fieldName] = {
                  $not: { $regex: convertedValue, $options: 'i' },
                };
                break;
              case 'startswith':
                conditionObj[fieldName] = {
                  $regex: `^${convertedValue}`,
                  $options: 'i',
                };
                break;
              case 'endswith':
                conditionObj[fieldName] = {
                  $regex: `${convertedValue}$`,
                  $options: 'i',
                };
                break;
              case 'blank':
                conditionObj[fieldName] = null;
                break;
              case 'notblank':
                conditionObj[fieldName] = { $ne: null };
                break;
              case 'before':
                console.log('before convertedValue fieldName', convertedValue);
                conditionObj[fieldName] = { $lt: convertedValue };
                break;
              case 'after':
                console.log('after convertedValue fieldName', convertedValue);
                conditionObj[fieldName] = { $gt: convertedValue };
                break;
              default:
                console.warn(`Unsupported operator: ${condition.operator}`);
                return null;
            }
            return Object.keys(conditionObj).length > 0 ? conditionObj : null;
          })
          .filter(Boolean);

        if (orConditions.length > 0) {
          // Only create/modify $or array if we have valid conditions
          if (!matchConditions.$or) {
            matchConditions.$or = [];
          }
          matchConditions.$or.push(...orConditions);

          // Filter out any empty objects that might have slipped through
          if (matchConditions.$or.length > 0) {
            matchConditions.$or = matchConditions.$or.filter(
              (condition) => condition && Object.keys(condition).length > 0
            );
          }
        }
      }
    }
  });

  return { matchConditions, dateConversions };
};
