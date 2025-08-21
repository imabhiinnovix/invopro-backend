import { Request, Response, NextFunction } from 'express';
import * as dashboardThemeService from '../../../database/services/common/dashboardTheme.services';
import { populate } from 'dotenv';

export const createDashboardTheme = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { organizationId, isSuperUser } = req.user;
    const bodyOrganizationId = req.body.bodyOrganizationId;
    if (isSuperUser && bodyOrganizationId) {
      organizationId = bodyOrganizationId;
    }

    const themeData = {
      ...req.body,
      organizationId,
    };

    const newTheme = await dashboardThemeService.createDashboardTheme(themeData);

    return res.status(201).json({
      success: true,
      message: 'Dashboard theme created successfully',
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

export const updateDashboardTheme = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { organizationId, isSuperUser } = req.user;
    const { themeId } = req.params;
    let updateData = req.body;
    const bodyOrganizationId = req.body.bodyOrganizationId;
    if (isSuperUser && bodyOrganizationId) {
      organizationId = bodyOrganizationId;
    }

    updateData = { ...updateData, organizationId };
    const updatedTheme = await dashboardThemeService.updateDashboardTheme(themeId, updateData);

    if (!updatedTheme) {
      return res.status(404).json({ message: 'Theme not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Theme updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getDashboardThemeList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;
    const { page = 1, limit = 10, sortField = 'updatedAt', sortOrder = -1, select = '', paginate = true } = req.query;

    // Build query: fetch only fonts of the current organization
    const query: any = { organizationId };

    // Sorting object
    const sort: Record<string, any> = { [sortField as string]: Number(sortOrder) };

    const result = await dashboardThemeService.getDashboardThemeList({
      query,
      select,
      page: Number(page),
      limit: Number(limit),
      sort,
      populate: ['dashboardFont'],
      paginate: paginate === 'true' || paginate === true,
    });

    return res.status(200).json({
      success: true,
      message: 'Dashboard themes retrieved successfully',
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

export const deleteDashboardTheme = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { themeId } = req.params;

    const deletedTheme = await dashboardThemeService.deleteDashboardTheme(themeId);

    if (!deletedTheme) {
      return res.status(404).json({ message: 'Theme not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Theme deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};
