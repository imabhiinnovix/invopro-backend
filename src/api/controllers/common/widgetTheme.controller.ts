import { Request, Response, NextFunction } from 'express';
import * as widgetThemeService from '../../../database/services/common/widgetTheme.service';

export const createWidgetTheme = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId, userId } = req.user;
    const widgetThemeData = {
      ...req.body,
      organizationId,
      createdBy: userId,
    };
    const widgetTheme = await widgetThemeService.createWidgetTheme(widgetThemeData);
    return res.status(201).json({
      success: true,
      message: 'Widget theme created successfully',
      data: widgetTheme,
    });
  } catch (err) {
    next(err);
  }
};

export const getAllWidgetThemes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;

    const widgetThemes = await widgetThemeService.findAllWidgetThemes({ query: { organizationId, isDeleted: false } });
    return res.status(200).json({
      success: true,
      message: 'Widget themes fetched successfully',
      ...widgetThemes,
    });
  } catch (err) {
    next(err);
  }
};

export const getWidgetThemeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const widgetTheme = await widgetThemeService.findWidgetThemeById(req.params.widgetThemeId);
    if (!widgetTheme) {
      return res.status(404).json({ message: 'Widget config not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Widget theme fetched successfully',
      data: widgetTheme,
    });
  } catch (err) {
    next(err);
  }
};

export const updateWidgetTheme = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isDefault } = req.body;
    const widgetTheme = await widgetThemeService.findWidgetTheme({
      _id: req.params.widgetThemeId,
      organizationId: req.user.organizationId,
    });

    if (!widgetTheme) {
      return res.status(404).json({ success: false, message: 'Widget theme not found' });
    }

    if (isDefault === true) {
      await widgetThemeService.updateWidgetThemeMany({}, { isDefault: false });
    }

    await widgetThemeService.updateWidgetTheme(req.params.widgetThemeId, req.body);
    return res.status(200).json({
      success: true,
      message: 'Widget theme updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const deleteWidgetTheme = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const widgetTheme = await widgetThemeService.findWidgetThemeById(req.params.widgetThemeId);

    if (!widgetTheme) {
      return res.status(404).json({
        success: false,
        message: 'Widget theme not found',
      });
    }

    widgetTheme.isDeleted = true;
    await widgetTheme.save();

    return res.status(200).json({
      success: true,
      message: 'Widget theme deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const duplicateWidgetTheme = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const widgetTheme = await widgetThemeService.findWidgetThemeById(req.params.widgetThemeId);
    if (!widgetTheme) {
      return res.status(404).json({
        success: false,
        message: 'Widget theme not found',
      });
    }

    const widgetThemeData = widgetTheme.toObject();

    const newWidgetTheme = await widgetThemeService.createWidgetTheme({
      ...widgetThemeData,
      _id: undefined,
    });

    return res.status(200).json({
      success: true,
      message: 'Widget theme duplicated successfully',
      data: newWidgetTheme,
    });
  } catch (err) {
    next(err);
  }
};
