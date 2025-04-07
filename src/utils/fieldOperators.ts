/* eslint-disable @typescript-eslint/no-explicit-any */

import { validatorOperatorData } from './Operators';

// Helper function to get operators for a specific field type
export const getOperatorsForFieldType = (fieldType: string) => {
  const fieldTypeGroup = validatorOperatorData.find((group) => group.fieldType === fieldType);
  return fieldTypeGroup ? fieldTypeGroup.operators : [];
};

// Helper function to validate if an operator is valid for a field type
export const isValidOperatorForFieldType = (fieldType: string, operatorKey: string): boolean => {
  const operators = getOperatorsForFieldType(fieldType);
  return operators.some((operator) => operator.operatorKey === operatorKey);
};

// Helper function to get operator details
export const getOperatorDetails = (fieldType: string, operatorKey: string) => {
  const operators = getOperatorsForFieldType(fieldType);
  return operators.find((operator) => operator.operatorKey === operatorKey);
};

// Helper function to check if an operator requires a value
export const doesOperatorRequireValue = (fieldType: string, operatorKey: string): boolean => {
  const operator = getOperatorDetails(fieldType, operatorKey);
  return operator ? operator.valueRequired : false;
};
