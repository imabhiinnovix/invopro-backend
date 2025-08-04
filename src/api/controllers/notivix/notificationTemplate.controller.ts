import { Request, Response, NextFunction } from 'express';
import * as notificationTemplateService from '../../../database/services/notivix/notificationTemplate.service';

export const createNotificationTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
        name,
        entityId,
        code,
        subject,
        body,
        type,
        attachmentSettings
    } = req.body;

    const { organizationId, userId } = req.user;

    const result = await notificationTemplateService.createNotificationTemplate({
        organizationId,
        userId,
        entityId,
        name,
        code,
        subject,
        body,
        type,
        attachmentSettings
    });

    res.status(201).json({
      success: true,
      message: 'Notification Template Created Successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listNotificationTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, sort, select, populate, ...filters } = req.query as any;
    const result = await notificationTemplateService.getNotificationTemplates({
      query: filters,
      select,
      page: Number(page),
      limit: Number(limit),
      sort: sort ? JSON.parse(sort) : undefined,
      populate,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getNotificationTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await notificationTemplateService.getNotificationTemplateById(req.params.id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Notification Template Not Found',
      });
    }

    res.json({
      success: true,
      message: 'Notification Template Retrieved Successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


export const updateNotificationTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      entityId,
      code,
      subject,
      body,
      type,
      attachmentSettings
    } = req.body;

    const result = await notificationTemplateService.updateNotificationTemplate(req.params.id, {
      name,
      entityId,
      code,
      subject,
      body,
      type,
      attachmentSettings
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Notification Template Not Found',
      });
    }

    res.json({
      success: true,
      message: 'Notification Template Updated Successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


export const deleteNotificationTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await notificationTemplateService.deleteNotificationTemplate(req.params.id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Notification Template Not Found',
      });
    }

    res.json({
      success: true,
      message: 'Notification Template Deleted Successfully',
    });
  } catch (error) {
    next(error);
  }
};

