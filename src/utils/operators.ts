interface Operator {
  operatorKey: string;
  operatorName: string;
  valueRequired: boolean;
  order: number;
}

// Define the field type operator group structure
export interface FieldTypeOperators {
  fieldType: string;
  operatorType: string;
  operators: Operator[];
}

// Define the validator operator data
export const validatorOperatorData: FieldTypeOperators[] = [
  {
    fieldType: 'number',
    operatorType: 'field',
    operators: [
      {
        operatorKey: 'lt',
        operatorName: 'Less Than',
        valueRequired: true,
        order: 1,
      },
      {
        operatorKey: 'lte',
        operatorName: 'Less Than or Equal To',
        valueRequired: true,
        order: 2,
      },
      {
        operatorKey: 'gt',
        operatorName: 'Greater Than',
        valueRequired: true,
        order: 3,
      },
      {
        operatorKey: 'gte',
        operatorName: 'Greater Than or Equal To',
        valueRequired: true,
        order: 4,
      },
      {
        operatorKey: 'eq',
        operatorName: 'Equals',
        valueRequired: true,
        order: 5,
      },
      {
        operatorKey: 'ne',
        operatorName: 'Not Equals',
        valueRequired: true,
        order: 6,
      },
      {
        operatorKey: 'blank',
        operatorName: 'Is Blank',
        valueRequired: false,
        order: 7,
      },
      {
        operatorKey: 'notblank',
        operatorName: 'Is Not Blank',
        valueRequired: false,
        order: 8,
      },
    ],
  },
  {
    fieldType: 'text',
    operatorType: 'field',
    operators: [
      {
        operatorKey: 'blank',
        operatorName: 'Is Blank',
        valueRequired: false,
        order: 1,
      },
      {
        operatorKey: 'notblank',
        operatorName: 'Is Not Blank',
        valueRequired: false,
        order: 2,
      },
      {
        operatorKey: 'contains',
        operatorName: 'Contains',
        valueRequired: true,
        order: 3,
      },
      {
        operatorKey: 'notcontains',
        operatorName: 'Does Not Contain',
        valueRequired: true,
        order: 4,
      },
      {
        operatorKey: 'eq',
        operatorName: 'Equals',
        valueRequired: true,
        order: 5,
      },
      {
        operatorKey: 'ne',
        operatorName: 'Not Equals',
        valueRequired: true,
        order: 6,
      },
      {
        operatorKey: 'startswith',
        operatorName: 'Starts With',
        valueRequired: true,
        order: 7,
      },
      {
        operatorKey: 'endswith',
        operatorName: 'Ends With',
        valueRequired: true,
        order: 8,
      },
    ],
  },
  {
    fieldType: 'date',
    operatorType: 'field',
    operators: [
      {
        operatorKey: 'before',
        operatorName: 'Before',
        valueRequired: true,
        order: 1,
      },
      {
        operatorKey: 'after',
        operatorName: 'After',
        valueRequired: true,
        order: 2,
      },
      {
        operatorKey: 'on',
        operatorName: 'On',
        valueRequired: true,
        order: 3,
      },
      {
        operatorKey: 'noton',
        operatorName: 'Not On',
        valueRequired: true,
        order: 4,
      },
      {
        operatorKey: 'blank',
        operatorName: 'Is Blank',
        valueRequired: false,
        order: 5,
      },
      {
        operatorKey: 'notblank',
        operatorName: 'Is Not Blank',
        valueRequired: false,
        order: 6,
      },
      {
        operatorKey: 'onOrAfterToday',
        operatorName: 'Due On or After Today',
        valueRequired: false,
        order: 7,
      },
      {
        operatorKey: 'onOrBeforeToday',
        operatorName: 'Due On or Before Today',
        valueRequired: false,
        order: 8,
      },
      {
        operatorKey: 'afterToday',
        operatorName: 'Due After Today',
        valueRequired: false,
        order: 9,
      },
      {
        operatorKey: 'beforeToday',
        operatorName: 'Due Before Today',
        valueRequired: false,
        order: 10,
      },
    ],
  },
  {
    fieldType: 'boolean',
    operatorType: 'field',
    operators: [
      {
        operatorKey: 'eq',
        operatorName: 'Equals',
        valueRequired: true,
        order: 1,
      },
      {
        operatorKey: 'ne',
        operatorName: 'Not Equals',
        valueRequired: true,
        order: 2,
      },
      {
        operatorKey: 'blank',
        operatorName: 'Is Blank',
        valueRequired: false,
        order: 3,
      },
      {
        operatorKey: 'notblank',
        operatorName: 'Is Not Blank',
        valueRequired: false,
        order: 4,
      },
    ],
  },
  {
    fieldType: 'richtext',
    operatorType: 'field',
    operators: [
      {
        operatorKey: 'blank',
        operatorName: 'Is Blank',
        valueRequired: false,
        order: 1,
      },
      {
        operatorKey: 'notblank',
        operatorName: 'Is Not Blank',
        valueRequired: false,
        order: 2,
      },
      {
        operatorKey: 'contains',
        operatorName: 'Contains',
        valueRequired: true,
        order: 3,
      },
      {
        operatorKey: 'notcontains',
        operatorName: 'Does Not Contain',
        valueRequired: true,
        order: 4,
      },
      {
        operatorKey: 'eq',
        operatorName: 'Equals',
        valueRequired: true,
        order: 5,
      },
      {
        operatorKey: 'ne',
        operatorName: 'Not Equals',
        valueRequired: true,
        order: 6,
      },
    ],
  },
  {
    fieldType: 'url',
    operatorType: 'field',
    operators: [
      {
        operatorKey: 'blank',
        operatorName: 'Is Blank',
        valueRequired: false,
        order: 1,
      },
      {
        operatorKey: 'notblank',
        operatorName: 'Is Not Blank',
        valueRequired: false,
        order: 2,
      },
      {
        operatorKey: 'contains',
        operatorName: 'Contains',
        valueRequired: true,
        order: 3,
      },
      {
        operatorKey: 'notcontains',
        operatorName: 'Does Not Contain',
        valueRequired: true,
        order: 4,
      },
      {
        operatorKey: 'eq',
        operatorName: 'Equals',
        valueRequired: true,
        order: 5,
      },
      {
        operatorKey: 'ne',
        operatorName: 'Not Equals',
        valueRequired: true,
        order: 6,
      },
    ],
  },
  {
    fieldType: 'option',
    operatorType: 'field',
    operators: [
      {
        operatorKey: 'blank',
        operatorName: 'Is Blank',
        valueRequired: false,
        order: 1,
      },
      {
        operatorKey: 'notblank',
        operatorName: 'Is Not Blank',
        valueRequired: false,
        order: 2,
      },
      {
        operatorKey: 'eq',
        operatorName: 'Equals',
        valueRequired: true,
        order: 3,
      },
      {
        operatorKey: 'ne',
        operatorName: 'Not Equals',
        valueRequired: true,
        order: 4,
      },
    ],
  },
  {
    fieldType: 'multioption',
    operatorType: 'field',
    operators: [
      {
        operatorKey: 'blank',
        operatorName: 'Is Blank',
        valueRequired: false,
        order: 1,
      },
      {
        operatorKey: 'notblank',
        operatorName: 'Is Not Blank',
        valueRequired: false,
        order: 2,
      },
      {
        operatorKey: 'contains',
        operatorName: 'Contains',
        valueRequired: true,
        order: 3,
      },
      {
        operatorKey: 'notcontains',
        operatorName: 'Does Not Contain',
        valueRequired: true,
        order: 4,
      },
      {
        operatorKey: 'eq',
        operatorName: 'Equals',
        valueRequired: true,
        order: 5,
      },
      {
        operatorKey: 'ne',
        operatorName: 'Not Equals',
        valueRequired: true,
        order: 6,
      },
    ],
  },
  {
    fieldType: 'user',
    operatorType: 'field',
    operators: [
      {
        operatorKey: 'blank',
        operatorName: 'Is Blank',
        valueRequired: false,
        order: 1,
      },
      {
        operatorKey: 'notblank',
        operatorName: 'Is Not Blank',
        valueRequired: false,
        order: 2,
      },
      {
        operatorKey: 'eq',
        operatorName: 'Equals',
        valueRequired: true,
        order: 3,
      },
      {
        operatorKey: 'ne',
        operatorName: 'Not Equals',
        valueRequired: true,
        order: 4,
      },
    ],
  },
];
