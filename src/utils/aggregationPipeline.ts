/* eslint-disable @typescript-eslint/no-explicit-any */

import { Types } from 'mongoose';
import { processFieldConditions } from './conditionProcessor';

export const buildAggregationPipeline = (widget: any) => {
  // Initialize match conditions with dataSourceId and dataSourceVersionId
  const initialMatchConditions = {
    dataSourceId: new Types.ObjectId(widget.dataSourceId),
    dataSourceVersionId: { $in: widget.dataSourceVersionIdArray },
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

  // Process conditions using the common utility
  const { matchConditions, dateConversions } = processFieldConditions(
    conditionsByField,
    getFieldType,
    initialMatchConditions
  );

  // 2. Build grouping structure
  const groupFields = [...(widget.dimensions || []), ...(widget.groupBy || [])].reduce((acc, field) => {
    if (field === widget.dimensions[0]) {
      if (widget.dashBoardType === 'trend') {
        acc['name'] = getFieldPath(`${field}`);
      } else {
        acc['name'] = getFieldPath(`rowData.${field}`);
      }
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

  // Build the aggregation pipeline
  const pipeline: any[] = [];

  if (Object.keys(dateConversions).length > 0) {
    pipeline.push({ $addFields: dateConversions });
  }

  if (widget.widgetType === 'number') {
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
      },
      {
        $group: {
          _id: null,
          data: { $push: '$$ROOT' },
          total: { $sum: '$data' },
        },
      }
    );

    if (widget.dashBoardType === 'trend') {
      pipeline.push({ $sort: { name: 1 } });
    } else {
      pipeline.push({ $sort: { data: 1 } });
    }
  }

  return pipeline;
};
