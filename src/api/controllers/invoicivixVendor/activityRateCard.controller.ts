/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import * as activityRateCardService from '../../../database/services/invoicivixVendor/activityRateCard.service';
import { Types } from 'mongoose';

/**
 * ================================
 * CREATE
 * ================================
 */
export const createActivityRateCard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId, userId } = req.user;

    const payload: any = {
      ...req.body,
      organizationId,
      userId,
    };

    if (payload.vendorId) {
      payload.vendorId = new Types.ObjectId(payload.vendorId);
    }

    if (payload.engagementLetterId) {
      payload.engagementLetterId = new Types.ObjectId(payload.engagementLetterId);
    }

    const rateCard = await activityRateCardService.createActivityRateCard(payload);

    res.status(201).json({
      success: true,
      message: 'Activity Rate Card created successfully',
      data: rateCard,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ================================
 * GET BY ID
 * ================================
 */
export const getActivityRateCardById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { activityRateCardId } = req.params;

    const data = await activityRateCardService.findActivityRateCardById(
      activityRateCardId,
      [
        { path: 'vendorId', select: 'name code' },
        { path: 'engagementLetterId', select: 'referenceNumber' },
      ]
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Activity Rate Card not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Activity Rate Card fetched successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ================================
 * UPDATE
 * ================================
 */
export const updateActivityRateCard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { activityRateCardId } = req.params;

    const updatePayload: any = { ...req.body };

    if (updatePayload.vendorId) {
      updatePayload.vendorId = new Types.ObjectId(updatePayload.vendorId);
    }

    if (updatePayload.engagementLetterId) {
      updatePayload.engagementLetterId = new Types.ObjectId(updatePayload.engagementLetterId);
    }

    const updated = await activityRateCardService.updateActivityRateCard(
      activityRateCardId,
      updatePayload
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Activity Rate Card not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Activity Rate Card updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ================================
 * DELETE
 * ================================
 */
export const deleteActivityRateCard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { activityRateCardId } = req.params;

    const deleted = await activityRateCardService.deleteActivityRateCard(
      activityRateCardId
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Activity Rate Card not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Activity Rate Card deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ================================
 * LIST
 * ================================
 */
export const getActivityRateCardList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { vendorId, costCode, costType } = req.query;
    const { organizationId, isSuperUser } = req.user;

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || Number.MAX_SAFE_INTEGER;

    const query: any = { status: 'active' };

    if (!isSuperUser) {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    if (vendorId) {
      query.vendorId = new Types.ObjectId(vendorId as string);
    }

    if (costCode) {
      query.costCode = costCode;
    }

    if (costType) {
      query.costType = costType;
    }

    const result = await activityRateCardService.getActivityRateCardList({
      query,
      page,
      limit,
      populate: [
        { path: 'vendorId', select: 'name code' },
        { path: 'engagementLetterId', select: 'referenceNumber' },
      ],
    });

    res.status(200).json({
      success: true,
      message: 'Activity Rate Cards fetched successfully',
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (err) {
    next(err);
  }
};