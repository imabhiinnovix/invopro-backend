import { Request, Response, NextFunction } from 'express';
import * as NotificationMediumService from '../../../database/services/notivix/notificationMedium.service';

export const createNotificationMedium = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { medium, fromAddress, serviceName, apiKey, enabled } = req.body;
    const { organizationId, userId } = req.user;

    const data = await NotificationMediumService.createNotificationMedium({
      organizationId,
      userId,
      medium,
      fromAddress,
      serviceName,
      apiKey,
      enabled,
    });

    res.status(201).json({
      success: true,
      message: 'Notification Medium Created Successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const updateNotificationMedium = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { medium, fromAddress, serviceName, apiKey, enabled } = req.body;

    const data = await NotificationMediumService.updateNotificationMedium(req.params.id, {
      medium,
      fromAddress,
      serviceName,
      apiKey,
      enabled,
    });

    res.status(200).json({
      success: true,
      message: 'Notification Medium Updated Successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteNotificationMedium = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;

    await NotificationMediumService.deleteNotificationMedium(req.params.id, organizationId);

    res.status(200).json({
      success: true,
      message: 'Notification Medium Deleted Successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const listNotificationMediums = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;

    const data = await NotificationMediumService.listNotificationMediums({ organizationId });

    res.status(200).json({
      success: true,
      message: 'Notification Mediums Fetched Successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const getNotificationMedium = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;

    const data = await NotificationMediumService.getNotificationMedium(req.params.id, { organizationId });

    res.status(200).json({
      success: true,
      message: 'Notification Medium Fetched Successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
};
