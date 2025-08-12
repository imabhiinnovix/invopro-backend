import { Request, Response, NextFunction } from 'express';
import * as dashboardThemeService from '../../../database/services/common/dashboardTheme.services';

export const createDashboardThemeController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;

    const themeData = {
      ...req.body,
      organizationId,
    };

    const newTheme = await dashboardThemeService.createDashboardTheme(themeData);

    return res.status(201).json({
      success: true,
      message: 'Dashboard theme created successfully',
      data: newTheme,
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

export const updateDashboardTheme = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { themeId } = req.params; // ID from route params
    const updateData = req.body; // Updated fields from request body

    const updatedTheme = await dashboardThemeService.updateDashboardTheme(themeId, updateData);

    if (!updatedTheme) {
      return res.status(404).json({ message: 'Theme not found' });
    }

    res.status(200).json({
      message: 'Theme updated successfully',
      data: updatedTheme,
    });
  } catch (err) {
    next(err);
  }
};
