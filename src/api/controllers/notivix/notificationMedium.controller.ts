import { Request, Response, NextFunction } from 'express';
import * as NotificationMediumService from '../../../database/services/notivix/notificationMedium.service';
import { Types } from 'mongoose';
const isValidObjectId = (id?: string) => !!(id && Types.ObjectId.isValid(id));

export const createNotificationMedium = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, mediumSettings, organizationId: paramOrgId } = req.body;
 // Allow query override of organizationId for super users:
    let { organizationId, isSuperUser, userId } = req.user as any;

    if (isSuperUser && paramOrgId) {
      organizationId = paramOrgId;
    }

    if (!Array.isArray(mediumSettings) || mediumSettings.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'mediumSettings must be a non-empty array',
      });
    }

    const createPayload = mediumSettings.map((ms: any) => ({
      organizationId,
      userId,
      productId,
      medium: ms.medium,
      fromAddress: ms.fromAddress,
      serviceName: ms.serviceName,
      apiKey: ms.apiKey,
      enabled: ms.enabled,
    }));

    const data = await NotificationMediumService.createManyNotificationMediums(createPayload);

    res.status(201).json({
      success: true,
      message: 'Notification Medium(s) Created Successfully',
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


/**
 * DELETE many notification mediums by array of ids (body only).
 * Body: { ids: ["id1","id2", ...] }
 */
export const deleteNotificationMedium = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;
    const ids = req.body?.ids;

    // Ensure ids provided and is an array
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids array is required in request body' });
    }

    // Validate ids
    const invalid = (ids as string[]).filter((id) => !isValidObjectId(id));
    if (invalid.length > 0) {
      return res.status(400).json({ success: false, message: `Invalid ObjectId(s): ${invalid.join(', ')}` });
    }

    // Call service (service will scope to organizationId)
    const result = await NotificationMediumService.deleteNotificationMediumsByIds(ids, organizationId);

    res.status(200).json({
      success: true,
      message: 'Notification Medium(s) Deleted Successfully',
      deletedCount: result.deletedCount ?? 0,
    });
  } catch (err) {
    next(err);
  }
};


export const listNotificationMediums = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Allow query override of organizationId for super users:
    const { organizationId: paramOrgId } = req.query;
    let { organizationId, isSuperUser } = req.user as any;

    if (isSuperUser && paramOrgId) {
      organizationId = paramOrgId;
    }

    // Build query by taking all query params and ensuring organizationId is set
    const query: Record<string, any> = {
      ...req.query,
      organizationId,
    };


    // Ensure we don't keep the original organizationId from query if overwritten by req.user
    // (this will still set organizationId to the correct value above)
    // No further filtering of keys here — service will receive exactly what's needed.
    const data = await NotificationMediumService.listNotificationMediums(query);

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
