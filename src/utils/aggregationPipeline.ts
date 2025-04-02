/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  OperatorType,
  AggregationType,
  DateRange,
  Condition,
  Widget,
  MongoDateRange,
  MongoOperator,
  DateConversion,
  MatchCondition,
  GroupFields,
  AggregationOperation,
} from '../types/widget.types';

// Helper functions
const createDateRange = (date: Date): MongoDateRange => {
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);
  return { $gte: startOfDay, $lt: endOfDay };
};

const createMongoOperator = (operator: string, value: unknown): MongoOperator => {
  const operators: Record<string, (val: unknown) => MongoOperator> = {
    lt: (val) => ({ $lt: val }),
    lte: (val) => ({ $lte: val }),
    gt: (val) => ({ $gt: val }),
    gte: (val) => ({ $gte: val }),
    ne: (val) => ({ $ne: val }),
  };
  return operators[operator]?.(value) || {};
};

const createRegexOperator = (pattern: string, isNot: boolean = false): MongoOperator => {
  const regex = { $regex: pattern, $options: 'i' };
  return isNot ? { $not: regex } : regex;
};

const handleDateConversion = (
  condition: Condition
): { dateConversion?: DateConversion; matchCondition?: MatchCondition } => {
  if (
    condition.operator === OperatorType.BETWEEN &&
    (condition.value as DateRange)?.startDate &&
    (condition.value as DateRange)?.endDate
  ) {
    const convertedField = `converted_${condition.field}`;
    return {
      dateConversion: {
        [convertedField]: {
          $dateFromString: { dateString: `$rowData.${condition.field}` },
        },
      },
      matchCondition: {
        [convertedField]: {
          $gte: new Date((condition.value as DateRange).startDate),
          $lte: new Date((condition.value as DateRange).endDate),
        },
      },
    };
  }
  return {};
};

const handleOtherOperators = (condition: Condition): MatchCondition => {
  const fieldPath = `rowData.${condition.field}`;
  const { operator, value } = condition;

  // Helper function to convert value to appropriate type
  const convertValue = (val: unknown, op: OperatorType): unknown => {
    if (
      op === OperatorType.GREATER_THAN ||
      op === OperatorType.GREATER_THAN_EQUALS ||
      op === OperatorType.LESS_THAN ||
      op === OperatorType.LESS_THAN_EQUALS
    ) {
      // Convert to number for numeric comparisons
      return Number(val);
    }
    return val;
  };

  const operators: Record<OperatorType, (val: unknown) => MongoOperator> = {
    [OperatorType.EQUALS]: (val) => ({ $eq: val }),
    [OperatorType.LESS_THAN]: (val) => createMongoOperator('lt', convertValue(val, OperatorType.LESS_THAN)),
    [OperatorType.LESS_THAN_EQUALS]: (val) =>
      createMongoOperator('lte', convertValue(val, OperatorType.LESS_THAN_EQUALS)),
    [OperatorType.GREATER_THAN]: (val) => createMongoOperator('gt', convertValue(val, OperatorType.GREATER_THAN)),
    [OperatorType.GREATER_THAN_EQUALS]: (val) =>
      createMongoOperator('gte', convertValue(val, OperatorType.GREATER_THAN_EQUALS)),
    [OperatorType.NOT_EQUALS]: (val) => createMongoOperator('ne', val),
    [OperatorType.BLANK]: () => ({ $eq: null }),
    [OperatorType.NOT_BLANK]: () => ({ $ne: null }),
    [OperatorType.CONTAINS]: (val) => createRegexOperator(val as string),
    [OperatorType.NOT_CONTAINS]: (val) => createRegexOperator(val as string, true),
    [OperatorType.STARTS_WITH]: (val) => createRegexOperator(`^${val as string}`),
    [OperatorType.ENDS_WITH]: (val) => createRegexOperator(`${val as string}$`),
    [OperatorType.BETWEEN]: () => ({}),
    [OperatorType.BEFORE]: (val) => createMongoOperator('lt', new Date(val as string)),
    [OperatorType.AFTER]: (val) => createMongoOperator('gt', new Date(val as string)),
    [OperatorType.ON]: (val) => createDateRange(new Date(val as string)),
    [OperatorType.NOT_ON]: (val) => ({ $not: createDateRange(new Date(val as string)) }),
  };

  const mongoOperator = operators[operator]?.(value);
  return mongoOperator ? { [fieldPath]: mongoOperator } : {};
};

const buildGroupFields = (widget: Widget): GroupFields => {
  return [...widget.dimensions, ...widget.groupBy].reduce((acc, field) => {
    acc[field === widget.dimensions[0] ? 'name' : field] = `$rowData.${field}`;
    return acc;
  }, {} as GroupFields);
};

const getAggregationOperation = (widget: Widget): AggregationOperation => {
  const { type, attributeName } = widget.aggregation;
  const operations: Record<AggregationType, AggregationOperation> = {
    [AggregationType.COUNT]: { count: { $sum: 1 } },
    [AggregationType.SUM]: { total: { $sum: `$rowData.${attributeName}` } },
    [AggregationType.AVERAGE]: { average: { $avg: `$rowData.${attributeName}` } },
  };
  return operations[type] || operations[AggregationType.COUNT];
};

const buildPipelineStages = (
  dateConversions: DateConversion,
  matchConditions: MatchCondition,
  widget: Widget
): any[] => {
  const pipeline: any[] = [];

  if (Object.keys(dateConversions).length > 0) {
    pipeline.push({ $addFields: dateConversions });
  }

  pipeline.push(
    { $match: matchConditions },
    {
      $group: {
        _id: buildGroupFields(widget),
        ...getAggregationOperation(widget),
      },
    },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            '$_id',
            {
              data: `$${Object.keys(getAggregationOperation(widget))[0]}`,
            },
          ],
        },
      },
    }
  );

  return pipeline;
};

export const buildAggregationPipeline = (widget: Widget): any[] => {
  if (!widget.dimensions?.length) {
    throw new Error('Widget must have at least one dimension');
  }

  // 1. Handle date conversions and match conditions
  const dateConversions: DateConversion = {};
  const matchConditions: MatchCondition = {
    dataSourceId: widget.dataSourceId._id,
    dataSourceVersionId: widget.dataSourceVersionId,
  };

  widget.conditions?.forEach((condition) => {
    const { dateConversion, matchCondition } = handleDateConversion(condition);
    if (dateConversion) {
      Object.assign(dateConversions, dateConversion);
    }
    if (matchCondition) {
      Object.assign(matchConditions, matchCondition);
    }
    Object.assign(matchConditions, handleOtherOperators(condition));
  });

  // 2. Build and return pipeline stages
  return buildPipelineStages(dateConversions, matchConditions, widget);
};
