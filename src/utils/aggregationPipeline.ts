/* eslint-disable @typescript-eslint/no-explicit-any */

export const buildAggregationPipeline = (widget: any) => {
  // 1. Handle date conversions for 'between' conditions
  const dateConversions = {};
  const matchConditions: any = {
    dataSourceId: widget.dataSourceId._id,
    dataSourceVersionId: widget.dataSourceVersionId,
  };

  widget.conditions?.forEach((condition) => {
    if (condition.operator === 'between' && condition.value?.startDate && condition.value?.endDate) {
      const convertedField = `converted_${condition.field}`;

      // Add date conversion
      dateConversions[convertedField] = {
        $dateFromString: { dateString: `$rowData.${condition.field}` },
      };

      // Add date range match
      matchConditions[convertedField] = {
        $gte: new Date(condition.value.startDate),
        $lte: new Date(condition.value.endDate),
      };
    } else {
      // Handle other operators
      const fieldPath = `rowData.${condition.field}`;
      switch (condition.operator) {
        case 'equals':
          matchConditions[fieldPath] = condition.value;
          break;
        case 'lt':
        case 'lte':
        case 'gt':
        case 'gte':
        case 'ne':
          matchConditions[fieldPath] = { [`$${condition.operator}`]: condition.value };
          break;
        case 'blank':
          matchConditions[fieldPath] = null;
          break;
        case 'notblank':
          matchConditions[fieldPath] = { $ne: null };
          break;
        case 'contains':
          matchConditions[fieldPath] = { $regex: condition.value, $options: 'i' };
          break;
        case 'notcontains':
          matchConditions[fieldPath] = { $not: { $regex: condition.value, $options: 'i' } };
          break;
        case 'startswith':
          matchConditions[fieldPath] = { $regex: `^${condition.value}`, $options: 'i' };
          break;
        case 'endswith':
          matchConditions[fieldPath] = { $regex: `${condition.value}$`, $options: 'i' };
          break;

        // Date conditions
        case 'before':
        case 'after':
          matchConditions[fieldPath] = {
            [`$${condition.operator === 'before' ? 'lt' : 'gt'}`]: new Date(condition.value),
          };
          break;
        case 'on':
        case 'noton': {
          const startOfDay = new Date(condition.value);
          startOfDay.setUTCHours(0, 0, 0, 0);

          const endOfDay = new Date(condition.value);
          endOfDay.setUTCHours(23, 59, 59, 999);

          matchConditions[fieldPath] =
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
      acc['name'] = `$rowData.${field}`;
    } else {
      acc[field] = `$rowData.${field}`;
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
      aggregationOperation = { total: { $sum: `$rowData.${aggregationField}` } };
      break;
    case 'Average':
      aggregationOperation = { average: { $avg: `$rowData.${aggregationField}` } };
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
