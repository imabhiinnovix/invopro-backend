/* @ts-nocheck */

import { Request, Response, NextFunction } from "express";
import {
  createVisibilitySettingService,
  deleteVisibilitySettingService,
  listVisibilitySettingService,
  updateVisibilitySettingService
} from "../../../database/services/common/organizationVisibilitySettingService";

export const createVisibilitySetting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId: paramOrgId } = req.query;
    let { organizationId, isSuperUser, userId } = req.user as any;

    // Superuser override
    if (isSuperUser && paramOrgId) {
      organizationId = String(paramOrgId);
    }

    const payload = {
      ...req.body,
      organizationId,
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

export const updateVisibilitySetting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { settingId } = req.params;
    const { userId, organizationId } = req.user as any;

    const payload = {
      ...req.body,
      organizationId,
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


export const deleteVisibilitySetting = async (req: Request, res: Response, next: NextFunction) => {
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

export const listVisibilitySettings = async (req: Request, res: Response, next: NextFunction) => {
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