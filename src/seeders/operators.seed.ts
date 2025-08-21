/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import Operator from '../database/models/common/operator';
import { validatorOperatorData } from '../utils/operators';

export async function seedOperators() {
  try {
    console.info('\n====> Updating operators <====');

    for (const fieldTypeData of validatorOperatorData) {
      const existingOperator = await Operator.findOne({ fieldType: fieldTypeData.fieldType });

      if (existingOperator) {
        // Get current operator keys in the database
        const existingOperatorKeys = existingOperator.operators.map((op) => op.operatorKey);

        // Get current operator keys in the validator data
        const validatorOperatorKeys = fieldTypeData.operators.map((op) => op.operatorKey);

        // Find new operators that need to be added
        const newOperatorKeys = validatorOperatorKeys.filter((key) => !existingOperatorKeys.includes(key));

        if (newOperatorKeys.length > 0) {
          // Get the new operators to add
          const newOperators = fieldTypeData.operators.filter((op) => newOperatorKeys.includes(op.operatorKey));

          // Add the new operators to the existing document
          existingOperator.operators.push(
            ...newOperators.map((op) => ({
              operatorKey: op.operatorKey,
              operatorName: op.operatorName,
              operatorType: fieldTypeData.operatorType,
              valueRequired: op.valueRequired,
              order: op.order,
            }))
          );

          await existingOperator.save();
          console.info(`Added ${newOperatorKeys.length} new operators to field type '${fieldTypeData.fieldType}'`);
        } else {
          console.info(`No new operators to add for field type '${fieldTypeData.fieldType}'`);
        }
      } else {
        // If the field type doesn't exist, create it
        const operator = new Operator({
          fieldType: fieldTypeData.fieldType,
          operators: fieldTypeData.operators.map((op) => ({
            operatorKey: op.operatorKey,
            operatorName: op.operatorName,
            operatorType: fieldTypeData.operatorType,
            valueRequired: op.valueRequired,
            order: op.order,
          })),
        });

        await operator.save();
        console.info(
          `Created new field type '${fieldTypeData.fieldType}' with ${fieldTypeData.operators.length} operators`
        );
      }
    }

    console.info('All operators updated successfully!');
  } catch (error) {
    console.error('Error updating operators:', error);
    throw error;
  }
}
