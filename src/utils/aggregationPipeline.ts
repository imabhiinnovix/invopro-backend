/* eslint-disable @typescript-eslint/no-explicit-any */

export const buildAggregationPipeline = (widget: any) => {
  // 1. Handle date conversions for 'between' conditions
  const dateConversions = {};
  const matchConditions: any = {
    dataSourceId: widget.dataSourceId._id,
    dataSourceVersionId: widget.dataSourceVersionId,
  };

  // Helper function to get field type from entity
  const getFieldType = (fieldName: string) => {
    const attribute = widget.entity.attributes.find((attr: any) => attr.name === fieldName);
    return attribute ? attribute.type : 'string';
  };

  // Helper function to get field path
  const getFieldPath = (fieldName: string) => {
    return `$${fieldName}`;
  };

  widget.conditions?.forEach((condition) => {
    const fieldType = getFieldType(condition.field);
    const fieldPath = getFieldPath(`rowData.${condition.field}`);

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

      switch (condition.operator) {
        case 'equal':
          matchConditions[`rowData.${condition.field}`] = convertedValue;
          break;
        case 'lt':
        case 'lte':
        case 'gt':
        case 'gte':
        case 'ne':
          matchConditions[`rowData.${condition.field}`] = { [`$${condition.operator}`]: convertedValue };
          break;
        case 'blank':
          matchConditions[`rowData.${condition.field}`] = null;
          break;
        case 'notblank':
          matchConditions[`rowData.${condition.field}`] = { $ne: null };
          break;
        case 'contains':
          matchConditions[`rowData.${condition.field}`] = { $regex: convertedValue, $options: 'i' };
          break;
        case 'notcontains':
          matchConditions[`rowData.${condition.field}`] = { $not: { $regex: convertedValue, $options: 'i' } };
          break;
        case 'startswith':
          matchConditions[`rowData.${condition.field}`] = { $regex: `^${convertedValue}`, $options: 'i' };
          break;
        case 'endswith':
          matchConditions[`rowData.${condition.field}`] = { $regex: `${convertedValue}$`, $options: 'i' };
          break;
        case 'before':
        case 'after':
          matchConditions[`rowData.${condition.field}`] = {
            [`$${condition.operator === 'before' ? 'lt' : 'gt'}`]: convertedValue,
          };
          break;
        case 'on':
        case 'noton': {
          const startOfDay = new Date(convertedValue);
          startOfDay.setUTCHours(0, 0, 0, 0);
          const endOfDay = new Date(convertedValue);
          endOfDay.setUTCHours(23, 59, 59, 999);
          matchConditions[`rowData.${condition.field}`] =
            condition.operator === 'on'
              ? { $gte: startOfDay, $lt: endOfDay }
              : { $not: { $gte: startOfDay, $lt: endOfDay } };
          break;
        }
      }
    }
  });

  // 2. Build grouping structure
  const groupFields = [...widget.dimensions, ...widget.groupBy].reduce((acc, field) => {
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
    }
  );

  return pipeline;
};
