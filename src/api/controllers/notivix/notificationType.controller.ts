import { Request, Response, NextFunction } from 'express';
import * as NotificationTypeService from '../../../database/services/notivix/notificationType.service';

export const createNotificationType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      entityId,
      triggerFieldId,
      conditionGroups,
    } = req.body;

    const { organizationId, userId } = req.user;
    const data = await NotificationTypeService.createNotificationType({
      organizationId,
      userId,
      name,
      entityId,
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
    const {
      name,
      entityId,
      triggerFieldId,
      conditionGroups,
    } = req.body;

    const { organizationId, userId } = req.user;

    const data = await NotificationTypeService.updateNotificationType(
      { _id: req.params.id, organizationId },
      {
        name,
        entityId,
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

    const data = await NotificationTypeService.listNotificationType({
      organizationId,
    });

    res.status(200).json({
      success: true,
      message: 'Notification Types Retrieved Successfully',
      data,
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

