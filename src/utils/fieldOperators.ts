/* eslint-disable @typescript-eslint/no-explicit-any */

// Define the operator structure
export interface Operator {
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
    fieldType: 'string',
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
    ],
  },
  {
    fieldType: 'result',
    operatorType: 'result',
    operators: [
      {
        operatorKey: 'present_both',
        operatorName: 'Present in both',
        valueRequired: false,
        order: 1,
      },
      {
        operatorKey: 'present_file1',
        operatorName: 'Present in file 1 not in file 2',
        valueRequired: false,
        order: 2,
      },
      {
        operatorKey: 'present_file2',
        operatorName: 'Present in file 2 not in file 1',
        valueRequired: false,
        order: 3,
      },
    ],
  },
];

// Helper function to get operators for a specific field type
export const getOperatorsForFieldType = (fieldType: string): Operator[] => {
  const fieldTypeGroup = validatorOperatorData.find((group) => group.fieldType === fieldType);
  return fieldTypeGroup ? fieldTypeGroup.operators : [];
};

// Helper function to validate if an operator is valid for a field type
export const isValidOperatorForFieldType = (fieldType: string, operatorKey: string): boolean => {
  const operators = getOperatorsForFieldType(fieldType);
  return operators.some((operator) => operator.operatorKey === operatorKey);
};

// Helper function to get operator details
export const getOperatorDetails = (fieldType: string, operatorKey: string): Operator | undefined => {
  const operators = getOperatorsForFieldType(fieldType);
  return operators.find((operator) => operator.operatorKey === operatorKey);
};

// Helper function to check if an operator requires a value
export const doesOperatorRequireValue = (fieldType: string, operatorKey: string): boolean => {
  const operator = getOperatorDetails(fieldType, operatorKey);
  return operator ? operator.valueRequired : false;
};
