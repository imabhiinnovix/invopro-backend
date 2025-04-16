/* eslint-disable @typescript-eslint/no-explicit-any */

import { Types } from 'mongoose';
import { isValidOperatorForFieldType, doesOperatorRequireValue } from './fieldOperators';

// Helper functions to handle operators based on field type
const handleNumberOperators = (condition: any, convertedValue: any, fieldPath: string, matchConditions: any) => {
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

const handleStringOperators = (condition: any, convertedValue: any, fieldPath: string, matchConditions: any) => {
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

const handleDateOperators = (condition: any, convertedValue: any, fieldPath: string, matchConditions: any) => {
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

const handleBooleanOperators = (condition: any, convertedValue: any, fieldPath: string, matchConditions: any) => {
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

const handleDefaultOperators = (condition: any, convertedValue: any, fieldPath: string, matchConditions: any) => {
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

export const buildAggregationPipeline = (widget: any) => {
  // 1. Handle date conversions for 'between' conditions
  const dateConversions = {};
  const matchConditions: any = {
    dataSourceId: new Types.ObjectId(widget.dataSourceId),
    dataSourceVersionId: new Types.ObjectId(widget.dataSourceVersionId),
  };

  // Helper function to get field path
  const getFieldPath = (fieldName: string) => {
    return `$${fieldName}`;
  };

  // Group conditions by field
  const conditionsByField: Record<string, any[]> = {};
  widget.conditions?.forEach((condition) => {
    if (!conditionsByField[condition.field]) {
      conditionsByField[condition.field] = [];
    }
    conditionsByField[condition.field].push(condition);
  });

  // Helper function to get field type from entity
  const getFieldType = (fieldName: string) => {
    const attribute = widget.entity.attributes.find((attr: any) => attr.name === fieldName);
    return attribute ? attribute.type : 'string';
  };

  // Process each field's conditions
  Object.entries(conditionsByField).forEach(([field, conditions]) => {
    const fieldType = getFieldType(field);
    const fieldPath = getFieldPath(`rowData.${field}`);
    const fieldName = `rowData.${field}`;

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
        if (fieldType === 'date') {
          dateConversions[convertedField] = {
            $cond: {
              if: { $eq: [{ $type: fieldPath }, 'date'] },
              then: fieldPath,
              else: {
                $dateFromString: {
                  dateString: fieldPath,
                  format: '%Y-%m-%dT%H:%M:%S.%LZ', // ISO format
                },
              },
            },
          };
        } else {
          dateConversions[convertedField] = {
            $dateFromString: {
              dateString: fieldPath,
              format: '%Y-%m-%dT%H:%M:%S.%LZ', // ISO format
            },
          };
        }

        matchConditions[convertedField] = {
          $gt: new Date(condition.value.startDate),
          $lt: new Date(condition.value.endDate),
        };
      } else if (fieldType === 'date' && ['on', 'noton', 'before', 'after'].includes(condition.operator)) {
        // Add date conversion for date fields with date-specific operators
        const convertedField = `converted_${condition.field}`;
        dateConversions[convertedField] = {
          $cond: {
            if: { $eq: [{ $type: fieldPath }, 'date'] },
            then: fieldPath,
            else: {
              $dateFromString: {
                dateString: fieldPath,
                format: '%Y-%m-%dT%H:%M:%S.%LZ', // ISO format
              },
            },
          },
        };

        // Convert value to Date
        const convertedValue = new Date(condition.value);

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
        } else if (fieldType === 'date') {
          convertedValue = new Date(condition.value);
        } else if (fieldType === 'boolean') {
          convertedValue = condition.value === 'true';
        }

        // Handle operators based on field type
        switch (fieldType) {
          case 'number':
            handleNumberOperators(condition, convertedValue, fieldPath, matchConditions);
            break;
          case 'string':
            handleStringOperators(condition, convertedValue, fieldPath, matchConditions);
            break;
          case 'date':
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
                  : fieldType === 'date'
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
                  conditionObj[fieldName] = { $regex: convertedValue, $options: 'i' };
                  break;
                case 'notcontains':
                  conditionObj[fieldName] = { $not: { $regex: convertedValue, $options: 'i' } };
                  break;
                case 'startswith':
                  conditionObj[fieldName] = { $regex: `^${convertedValue}`, $options: 'i' };
                  break;
                case 'endswith':
                  conditionObj[fieldName] = { $regex: `${convertedValue}$`, $options: 'i' };
                  break;
                case 'blank':
                  conditionObj[fieldName] = null;
                  break;
                case 'notblank':
                  conditionObj[fieldName] = { $ne: null };
                  break;
                default:
                  console.warn(`Unsupported operator: ${condition.operator}`);
                  return null;
              }
              return conditionObj;
            })
            .filter(Boolean);

          if (orConditions.length > 0) {
            matchConditions.$or = matchConditions.$or || [];
            matchConditions.$or.push(...orConditions);
          }
        }
      } else {
        // Handle multiple non-numeric conditions for the same field using $or
        const orConditions = conditions
          .map((condition) => {
            const convertedValue =
              fieldType === 'number'
                ? Number(condition.value)
                : fieldType === 'date'
                  ? new Date(condition.value)
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
                conditionObj[fieldName] = { $regex: convertedValue, $options: 'i' };
                break;
              case 'notcontains':
                conditionObj[fieldName] = { $not: { $regex: convertedValue, $options: 'i' } };
                break;
              case 'startswith':
                conditionObj[fieldName] = { $regex: `^${convertedValue}`, $options: 'i' };
                break;
              case 'endswith':
                conditionObj[fieldName] = { $regex: `${convertedValue}$`, $options: 'i' };
                break;
              case 'blank':
                conditionObj[fieldName] = null;
                break;
              case 'notblank':
                conditionObj[fieldName] = { $ne: null };
                break;
              default:
                console.warn(`Unsupported operator: ${condition.operator}`);
                return null;
            }
            return conditionObj;
          })
          .filter(Boolean);

        if (orConditions.length > 0) {
          matchConditions.$or = matchConditions.$or || [];
          matchConditions.$or.push(...orConditions);
        }
      }
    }
  });

  // 2. Build grouping structure
  const groupFields = [...(widget.dimensions || []), ...(widget.groupBy || [])].reduce((acc, field) => {
    if (field === widget.dimensions[0]) {
      acc['name'] = getFieldPath(`rowData.${field}`);
    } else {
      acc[field] = getFieldPath(`rowData.${field}`);
    }
    return acc;
  }, {});

  // 3. Determine aggregation operation
  const aggregationField = widget.aggregation.attributeName;
  let aggregationOperation;

  switch (widget.aggregation.type) {
    case 'Count':
      aggregationOperation = { count: { $sum: 1 } };
      break;
    case 'Sum':
      aggregationOperation = { total: { $sum: getFieldPath(`rowData.${aggregationField}`) } };
      break;
    case 'Average':
      aggregationOperation = { average: { $avg: getFieldPath(`rowData.${aggregationField}`) } };
      break;
    default:
      aggregationOperation = { count: { $sum: 1 } };
  }

  // 4. Build the pipeline
  const pipeline: any[] = [];

  if (widget.widgetType === 'number') {
    // return [
    //   {
    //     $addFields: { name: 'Total' },
    //   },
    //   {
    //     $group: {
    //       _id: {
    //         name: '$name',
    //       },
    //       data: { $sum: 1 },
    //     },
    //   },
    //   {
    //     $replaceRoot: {
    //       newRoot: {
    //         $mergeObjects: [
    //           '$_id',
    //           {
    //             name: '$name',
    //             data: '$data',
    //           },
    //         ],
    //       },
    //     },
    //   },
    // ];
    if (Object.keys(dateConversions).length > 0) {
      pipeline.push({ $addFields: dateConversions });
    }

    pipeline.push(
      { $match: matchConditions },
      { $addFields: { name: 'Total' } },
      {
        $group: {
          _id: {
            name: '$name',
          },
          data: { $sum: 1 },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              '$_id',
              {
                name: '$name',
                data: '$data',
              },
            ],
          },
        },
      },
      {
        $match: {
          name: { $ne: null },
        },
      }
    );
  } else {
    if (Object.keys(dateConversions).length > 0) {
      pipeline.push({ $addFields: dateConversions });
    }

    pipeline.push(
      { $match: matchConditions },
      {
        $group: {
          _id: {
            ...groupFields,
          },
          ...aggregationOperation,
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              '$_id',
              {
                data: `$${Object.keys(aggregationOperation)[0]}`,
              },
            ],
          },
        },
      },
      {
        $match: {
          name: { $ne: null },
        },
      }
    );
  }

  return pipeline;
};
