import { Request, Response, NextFunction } from 'express';
import * as NotificationTypeService from '../../../database/services/notivix/notificationType.service';

export const createNotificationType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, dataSourceId, triggerFieldId, conditionGroups } = req.body;

    const { organizationId, userId } = req.user;
    const data = await NotificationTypeService.createNotificationType({
      organizationId,
      userId,
      name,
      dataSourceId,
      triggerFieldId,
      conditionGroups,
    });

    res.status(201).json({
      success: true,
      message: 'Notification Type Created Successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const updateNotificationType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, dataSourceId, triggerFieldId, conditionGroups } = req.body;

    const { organizationId, userId } = req.user;

    const data = await NotificationTypeService.updateNotificationType(
      { _id: req.params.id, organizationId },
      {
        name,
        dataSourceId,
        triggerFieldId,
        conditionGroups,
        updatedBy: userId,
      }
    );

    res.status(200).json({
      success: true,
      message: 'Notification Type Updated Successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteNotificationType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;

    await NotificationTypeService.deleteNotificationType({
      _id: req.params.id,
      organizationId,
    });

    res.status(200).json({
      success: true,
      message: 'Notification Type Deleted Successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const listNotificationType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;
    const { search, dataSourceId, page = 1, limit = 10, sort } = req.query;

    const parsedPage = parseInt(page as string, 10) || 1;
    const parsedLimit = parseInt(limit as string, 10) || 10;

    const query: any = { organizationId, status: 'active' };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (dataSourceId) {
      query.dataSourceId = dataSourceId;
    }

    const result = await NotificationTypeService.listNotificationType({
      query,
      page: parsedPage,
      limit: parsedLimit,
      sort: sort ? JSON.parse(sort as string) : { updatedAt: -1 },
      populate: ['dataSourceId'],
    });

    const totalPages = Math.ceil(result.totalCount / parsedLimit);

    res.status(200).json({
      success: true,
      message: 'Notification Types Retrieved Successfully',
      data: result.data,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        totalPages,
        totalRecords: result.totalCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getNotificationType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;

    const data = await NotificationTypeService.getNotificationType({
      _id: req.params.id,
      organizationId,
    });

    res.status(200).json({
      success: true,
      message: 'Notification Type Retrieved Successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
};
