/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

import * as dashboardService from '../../database/services/dashboard.services';
import * as dashboardWidgetdService from '../../database/services/dashboardWidget.services';

export const createDashboard = async (req: Request, res: Response, next: NextFunction) => {
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

    res.status(201).json({ success: true, message: 'Dashboard created successfully', data });
  } catch (err) {
    next(err);
  }
};

export const getDashboardById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dashboardId } = req.params;

    const data = await dashboardService.getDashboardById(dashboardId);

    res.status(200).json({ success: true, message: 'Data get successfully', data });
  } catch (err) {
    next(err);
  }
};

export const getDashboards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await dashboardService.getAllDashboards({
      query: {
        isDeleted: false,
        isActive: true,
      },
    });

    res.status(200).json({ success: true, message: 'Dashboard get successfully', ...data });
  } catch (err) {
    next(err);
  }
};

export const updateDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId: createdBy } = req.user;
    const { name, description, isActive } = req.body;

    await dashboardService.getDashboardById(req.params.dashboardId);

    const update: any = {
      ...(name && { name }),
      ...(description && { description }),
    };

    if (isActive != null || isActive != undefined) {
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

export const createWidget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dashboardId, widgetTypeId } = req.body;
    const { organizationId, userId } = req.user;

    const dashboardWidget = await dashboardWidgetdService.createDashboardWidget({
      dashboardId,
      widgetTypeId,
      organizationId,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Widget created successfully',
      data: dashboardWidget,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await dashboardService.updateDashboard(req.params.dashboardId, {
      isDeleted: true,
    });

    res.status(200).json({ success: true, message: 'Dashboard deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const updateWidget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, dimensions, groupBy, conditions, aggregation, dataSourceId, position } = req.body;
    const { dashboardWidgetId } = req.params;
    const { organizationId, userId } = req.user;

    await dashboardWidgetdService.updateDashboardWidget(dashboardWidgetId, {
      ...(name && { name }),
      ...(dataSourceId && { dataSourceId }),
      ...(aggregation && { aggregation }),
      ...(dimensions && { dimensions }),
      ...(groupBy && { groupBy }),
      ...(conditions.length > 0 && { conditions }),
      ...(position && { position }),
    });

    res.status(200).json({
      success: true,
      message: 'Widget updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getChartData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dashboardId, widgetTypeId } = req.params;
    const { organizationId, userId, orgCode } = req.user;

    // const data: any = await dashboardService.getDashboardChartData({
    //   dashboardId: new mongoose.Types.ObjectId(dashboardId),
    //   orgCode,
    // });

    res.status(200).json({
      success: true,
      message: 'Chart data fetched successfully',
      // ...data,
    });
  } catch (err) {
    next(err);
  }
};
