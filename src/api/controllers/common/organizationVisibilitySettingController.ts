/* @ts-nocheck */

import { Request, Response, NextFunction } from "express";
import {
  createVisibilitySettingService,
  deleteVisibilitySettingService,
  listVisibilitySettingService,
  updateVisibilitySettingService,
} from "../../../database/services/common/organizationVisibilitySettingService";

/**
 * CREATE
 */
export const createVisibilitySetting = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId: paramOrgId } = req.query;
    let { organizationId, isSuperUser, userId } = req.user as any;

    // Superuser override
    if (isSuperUser && paramOrgId) {
      organizationId = String(paramOrgId);
    }

    const payload = {
      organizationId,
      dataSourceId: req.body.dataSourceId ?? null,
      attributeId: req.body.attributeId ?? null,
      refAttributeId: req.body.refAttributeId || [],
      visibility: req.body.visibility,
      createdBy: userId,
    };

    const data = await createVisibilitySettingService(payload);

    res.status(201).json({
      success: true,
      message: "Organization visibility setting created successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UPDATE
 */
export const updateVisibilitySetting = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { settingId } = req.params;
    const { userId } = req.user as any;

    const payload = {
      dataSourceId: req.body.dataSourceId ?? null,
      attributeId: req.body.attributeId ?? null,
      refAttributeId: req.body.refAttributeId || [],
      visibility: req.body.visibility,
      updatedBy: userId,
    };

    const data = await updateVisibilitySettingService(settingId, payload);

    res.status(200).json({
      success: true,
      message: "Organization visibility setting updated successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE
 */
export const deleteVisibilitySetting = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { settingId } = req.params;
    const { organizationId: paramOrgId } = req.query;
    let { organizationId, isSuperUser } = req.user as any;

    // Superuser override
    if (isSuperUser && paramOrgId) {
      organizationId = String(paramOrgId);
    }

    await deleteVisibilitySettingService(settingId, organizationId);

    res.status(200).json({
      success: true,
      message: "Organization visibility setting deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * LIST
 */
export const listVisibilitySettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId: paramOrgId } = req.query;
    let { organizationId, isSuperUser } = req.user as any;

    // Superuser override
    if (isSuperUser && paramOrgId) {
      organizationId = String(paramOrgId);
    }

    const data = await listVisibilitySettingService(organizationId);

    res.status(200).json({
      success: true,
      message: "Organization visibility settings fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};