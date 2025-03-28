/* eslint-disable @typescript-eslint/no-explicit-any */

// const aggregationPipeline: any = [
//   {
//     $addFields: {
//       convertedDate: {
//         $dateFromString: {
//           dateString: '$rowData.DisclosureDate',
//         },
//       },
//     },
//   },
//   {
//     $match: {
//       dataSourceId: widget.dataSourceId,
//       convertedDate: {
//         $gt: new Date('2024-01-01T00:00:00.000Z'),
//         $lt: new Date('2025-01-01T00:00:00.000Z'),
//       },
//     },
//   },
//   {
//     $group: {
//       _id: {
//         name: '$rowData.SBU',
//         ...widget.groupBy.reduce((acc, field) => {
//           acc[field] = `$rowData.${field}`;
//           return acc;
//         }, {}),
//       },
//       count: { $sum: 1 },
//     },
//   },
//   // New stage to flatten the structure
//   {
//     $replaceRoot: {
//       newRoot: {
//         $mergeObjects: [
//           '$_id', // Bring all _id fields to root
//           { data: '$count' }, // Include the count
//         ],
//       },
//     },
//   },
// ];

export const buildAggregationPipeline = (widget: any) => {
  // 1. Handle date conversions for 'between' conditions
  const dateConversions = {};
  const matchConditions: any = { dataSourceId: widget.dataSourceId };

  // widget.conditions?.forEach((condition) => {
  //   if (condition.operator === 'between' && condition.value?.startDate && condition.value?.endDate) {
  //     const convertedField = `converted_${condition.field}`;

  //     // Add date conversion
  //     dateConversions[convertedField] = {
  //       $dateFromString: { dateString: `$rowData.${condition.field}` },
  //     };

  //     // Add date range match
  //     matchConditions[convertedField] = {
  //       $gt: new Date(condition.value.startDate),
  //       $lt: new Date(condition.value.endDate),
  //     };
  //   } else {
  //     // Handle other operators
  //     const fieldPath = `rowData.${condition.field}`;
  //     switch (condition.operator) {
  //       case 'equals':
  //         matchConditions[fieldPath] = condition.value;
  //         break;
  //       // Add more operator cases as needed
  //     }
  //   }
  // });

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
