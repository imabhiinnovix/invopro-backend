import { Request, Response, NextFunction } from 'express';
import * as NotificationFrequencyService from '../../../database/services/notivix/notificationFrequency.service';

export const createNotificationFrequency = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      notificationTypeId,
      frequency,
      schedulerStartDate,
      schedulerEndDate,
      interval,
      daysOfWeek,
      dayOfMonth,
      weekOfMonth,
      dayOfWeekInMonth,
      monthOfYear,
      dayOfYearMonth,
      repeatAnnually,
      acknowledgeRequired,
      attachmentRequired,
      recipients_to,
      recipients_cc,
      medium,
      templateId,
      triggerTime,
      maxOccurrences,
    } = req.body;

    const { organizationId, userId } = req.user;

    const data = await NotificationFrequencyService.createNotificationFrequency({
      organizationId,
      userId,
      notificationTypeId,
      frequency,
      schedulerStartDate,
      schedulerEndDate,
      interval,
      daysOfWeek,
      dayOfMonth,
      weekOfMonth,
      dayOfWeekInMonth,
      monthOfYear,
      dayOfYearMonth,
      repeatAnnually,
      acknowledgeRequired,
      attachmentRequired,
      recipients_to,
      recipients_cc,
      medium,
      templateId,
      triggerTime,
      maxOccurrences,
    });

    res.status(201).json({
      success: true,
      message: 'Notification Frequency Setting Created Successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
};




export const updateNotificationFrequency = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      frequency,
      schedulerStartDate,
      schedulerEndDate,
      interval,
      daysOfWeek,
      dayOfMonth,
      weekOfMonth,
      dayOfWeekInMonth,
      monthOfYear,
      dayOfYearMonth,
      repeatAnnually,
      acknowledgeRequired,
      attachmentRequired,
      recipients_to,
      recipients_cc,
      medium,
      templateId,
      triggerTime,
      maxOccurrences,
    } = req.body;

    const data = await NotificationFrequencyService.updateNotificationFrequency(req.params.id, {
      frequency,
      schedulerStartDate,
      schedulerEndDate,
      interval,
      daysOfWeek,
      dayOfMonth,
      weekOfMonth,
      dayOfWeekInMonth,
      monthOfYear,
      dayOfYearMonth,
      repeatAnnually,
      acknowledgeRequired,
      attachmentRequired,
      recipients_to,
      recipients_cc,
      medium,
      templateId,
      triggerTime,
      maxOccurrences,
    });

    res.status(200).json({
      success: true,
      message: 'Notification Frequency Setting Updated Successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
};



export const deleteNotificationFrequency = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;
    await NotificationFrequencyService.deleteNotificationFrequency(req.params.id, organizationId);

    res.json({
      success: true,
      message: 'Notification Frequency Deleted Successfully',
    });
  } catch (error: any) {
    next(error);
  }
};



export const listNotificationFrequency = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;

    const { notificationTypeId } = req.query; // or req.body if sent in body

    const query: any = {
      organizationId,
      isActive: 'active',
    };

    if (notificationTypeId) {
      query.notificationTypeId = notificationTypeId;
    }

    const data = await NotificationFrequencyService.listNotificationFrequency({
      query,
      populate: ['notificationTypeId', 'templateId', 'medium'],
    });

    res.status(200).json({
      success: true,
      message: 'Notification Frequency Settings Fetched Successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
};


export const getNotificationFrequency = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;

    const data = await NotificationFrequencyService.getNotificationFrequency(req.params.id, {
      organizationId,
      populate: ['notificationTypeId', 'templateId', 'medium'],
    });

    res.status(200).json({
      success: true,
      message: 'Notification Frequency Setting Fetched Successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
};
