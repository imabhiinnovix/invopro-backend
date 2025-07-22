/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';

import * as operatorService from '../../../database/services/common/operator.service';

export const createOperator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fieldType, operators } = req.body;

    if (!operators.length) {
      throw new Error('Please select the operator.');
    }

    const alredyExist = await operatorService.getOperator({ fieldType });
    if (alredyExist) {
      throw new Error('Duplicate Operator field found. Please remove or modify the entry.');
    }

    const data = await operatorService.create({ fieldType, operators });

    res.status(201).json({ success: true, message: 'Operator created successfully', data });
  } catch (error) {
    next(error);
  }
};

export const getOperatorById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { operatorId } = req.params;

    const data = await operatorService.getOperatorById(operatorId);

    res.status(200).json({ success: true, message: 'Data get successfully', data });
  } catch (err) {
    next(err);
  }
};

export const getOperators = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fieldType = 'all' } = req.body;
    const query: any = {};

    if (fieldType !== 'all') {
      query.fieldType = fieldType;
    }

    const data = await operatorService.getAllOperators({ query });

    res.status(200).json({ success: true, message: 'Operator get successfully', ...data });
  } catch (err) {
    next(err);
  }
};

export const updateOperator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fieldType, operators } = req.body;

    await operatorService.getOperatorById(req.params.operatorId);

    if (fieldType) {
      const operatorExist = await operatorService.getOperator({ fieldType });
      if (operatorExist) throw new Error('Duplicate Operator field found. Please remove or modify the entry.');
    }

    const update: any = {
      ...(fieldType && { fieldType }),
      ...(operators && { operators }),
    };

    const updatedData = await operatorService.updateOperatorById(req.params.operatorId, update);
    res.status(200).json({
      success: true,
      message: 'Operator updated successfully',
      data: updatedData,
    });
  } catch (err) {
    next(err);
  }
};
