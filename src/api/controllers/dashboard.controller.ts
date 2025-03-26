import { NextFunction, Request, Response } from 'express';
import * as dashboardService from '../../database/services/dashboard.service';

export const createDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name } = req.body;
    const { userId: createdBy, organizationId } = req.user;

    const dashboardExist = await dashboardService.getDashboard({
      name,
      createdBy,
      isDeleted: false,
    });

    if (dashboardExist) throw new Error('Duplicate Dashboard found. Please remove or modify the entry.');

    const data = await dashboardService.createDashboard({
      createdBy,
      organizationId,
      ...req.body,
    });

    res
      .status(201)
      .json({ success: true, message: 'Dashboard created successfully', data });
  } catch (err) {
    next(err);
  }
};

export const getDashboardById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { dashboardId } = req.params;

    const data = await dashboardService.getDashboardById(dashboardId);

    res
      .status(200)
      .json({ success: true, message: 'Data get successfully', data });
  } catch (err) {
    next(err);
  }
};

export const getDashboards = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await dashboardService.getAllDashboards({
      isDeleted: false,
      isActive: true,
    });

    res
      .status(200)
      .json({ success: true, message: 'Dashboard get successfully', data });
  } catch (err) {
    next(err);
  }
};

export const updateDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId: createdBy } = req.user;
    const { name, description, isActive } = req.body;

    await dashboardService.getDashboardById(
      req.params.dashboardId
    );

    const update: any = {
      ...(name && { name }),
      ...(description && { description }),
    };

    if(isActive != null || isActive != undefined) {
      update.isActive = isActive;
    }

    const dashboardExist = await dashboardService.getDashboard({
      name,
      createdBy,
      isDeleted: false,
    });

    if (dashboardExist) throw new Error('Duplicate Dashboard found. Please remove or modify the entry.');

    const updatedData = await dashboardService.updateDashboardById(req.params.dashboardId, update);
    res.status(200).json({
      success: true,
      message: 'Dashboard updated successfully',
      data: updatedData,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await dashboardService.updateDashboardById(req.params.dashboardId, {
      isDeleted: true
    });

    res.status(200).json({ success: true, message: 'Dashboard deleted successfully' });
  } catch (err) {
    next(err);
  }
};