import { Request, Response, NextFunction } from 'express';
import * as derivedFieldService from '../../../database/services/common/derivedField.services';

export const createDerivedField = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      entityId,
      type,
      persist,
      valueRules // directly received
    } = req.body;

    const newField = await derivedFieldService.createDerivedField({
      name,
      entityId,
      type,
      persist,
      valueRules
    });

     res.status(201).json({
      success: true,
      message: 'Data Source Created Successfully',
      data: newField,
    });
  } catch (err) {
    next(err);
  }
};

export const updateDerivedField = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      name,
      entityId,
      type,
      persist,
      valueRules // directly received
    } = req.body;

    const updated = await derivedFieldService.updateDerivedField(id, {
      name,
      entityId,
      type,
      persist,
      valueRules
    });

    res.status(201).json({
      success: true,
      message: 'Data Source updated Successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const deleteDerivedField = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await derivedFieldService.deleteDerivedField(id);
    res.status(200).json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const listDerivedFields = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const fields = await derivedFieldService.getAllDerivedFields({});
     res.status(200).json({
      success: true,
      message: 'Derived Fields Fetched Successfully',
      data: fields
    });
  } catch (err) {
    next(err);
  }
};

export const getDerivedFieldById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const derivedFieldDetails = await derivedFieldService.findDerivedFieldById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Derived Field Details Fetched Successfully',
      data: derivedFieldDetails,
    });
  } catch (err) {
    next(err);
  }
};
