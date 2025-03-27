/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from 'express';
import * as widgetTypeService from '../../database/services/widgetType.service';
import config from '../../config';

export const createWidget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, type, code } = req.body;

    if (!config.WIDGET_TYPE_ENUM.includes(type)) {
      throw new Error('Invalid type');
    }

    const widgetTypeExist = await widgetTypeService.getWidgetType({
      name,
      code: code.toLowerCase() || name.toLowerCase(),
      type: type.toLowerCase(),
    });

    if (widgetTypeExist) {
      throw new Error('Duplicate widget found. Please remove or modify the entry.');
    }

    const data = await widgetTypeService.createWidgetType({ ...req.body });

    res.status(201).json({ success: true, message: 'Widget type created successfully', data });
  } catch (err) {
    next(err);
  }
};

export const getWidgetTypeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { widgetTypeId } = req.params;
    const data = await widgetTypeService.getWidgetTypeById(widgetTypeId);

    res.status(200).json({ success: true, message: 'Widget get successfully', data });
  } catch (err) {
    next(err);
  }
};

export const getWidgets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await widgetTypeService.getAllWidgetType({ isActive: true });

    res.status(200).json({ success: true, message: 'Widget get successfully', ...data });
  } catch (err) {
    next(err);
  }
};

export const updateWidgetType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, type, isActive } = req.body;

    if (type) {
      if (!config.WIDGET_TYPE_ENUM.includes(type)) {
        throw new Error('Invalid type');
      }
    }

    const update: any = {
      ...(name && { name }),
      ...(description && { description }),
      ...(type && { type }),
    };

    if (isActive != null || isActive != undefined) {
      update.isActive = isActive;
    }

    const widgetTypeExist = await widgetTypeService.getWidgetType({
      name,
      type,
      isActive: true,
    });

    if (widgetTypeExist) {
      throw new Error('Duplicate widget found. Please remove or modify the entry.');
    }

    const updatedData = await widgetTypeService.updateWidgetTypeById(req.params.widgetTypeId, update);
    res.status(200).json({
      success: true,
      message: 'Widget type updated successfully',
      data: updatedData,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteWidgetType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await widgetTypeService.deleteWidgetType(req.params.widgetTypeId);

    res.status(200).json({ success: true, message: 'Widget type deleted successfully' });
  } catch (err) {
    next(err);
  }
};
