import { Request, Response, NextFunction } from 'express';

// import { Types } from 'mongoose';
// import * as dashboardWidgetdService from '../../database/services/dashboardWidget.services';
import * as widgetAppearanceService from '../../database/services/widgetAppearance.service';

export const getAllWidgetAppearance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;
    const widgetAppearance = await widgetAppearanceService.findAllWidgetAppearance({
      query: { organizationId, isDeleted: false },
    });
    return res.status(200).json({
      success: true,
      message: 'Widget appearance fetched successfully',
      ...widgetAppearance,
    });
  } catch (err) {
    next(err);
  }
};

export const createWidgetAppearance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dashboardWidgetId } = req.body;
    const { organizationId, userId } = req.user;
    const widgetAppearanceData = {
      ...req.body,
      organizationId,
      createdBy: userId,
    };
    const widgetAppearance = await widgetAppearanceService.createWidgetAppearance(widgetAppearanceData);

    // const dashboardWidget = await dashboardWidgetdService.getDashboardWidget({
    //   _id: dashboardWidgetId,
    //   organizationId,
    // });

    // if (!dashboardWidget) {
    //   throw new Error('Widget not found');
    // }

    // dashboardWidget.widgetAppearanceId = widgetAppearance._id as Types.ObjectId;
    // await dashboardWidget.save();

    return res.status(201).json({
      success: true,
      message: 'Widget appearance created successfully',
      data: widgetAppearance,
    });
  } catch (err) {
    next(err);
  }
};

export const updateWidgetAppearance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { widgetAppearanceid } = req.params;
    const { organizationId } = req.user;
    const widgetAppearance = await widgetAppearanceService.updateWidgetAppearance(widgetAppearanceid, {
      ...req.body,
      organizationId,
    });
    return res.status(200).json({
      success: true,
      message: 'Widget appearance updated successfully',
      data: widgetAppearance,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteWidgetAppearance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { widgetAppearanceid } = req.params;
    const { organizationId } = req.user;
    await widgetAppearanceService.deleteWidgetAppearance(widgetAppearanceid, organizationId);
    return res.status(200).json({
      success: true,
      message: 'Widget appearance deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getWidgetAppearanceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { widgetAppearanceid } = req.params;
    const { organizationId } = req.user;

    const widgetAppearance = await widgetAppearanceService.getWidgetAppearance({
      _id: widgetAppearanceid,
      organizationId,
    });

    return res.status(200).json({
      success: true,
      message: 'Widget appearance fetched successfully',
      data: widgetAppearance,
    });
  } catch (err) {
    next(err);
  }
};
