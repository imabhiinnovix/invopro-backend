/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import * as activityService from '../../../database/services/invoicivixVendor/activity.service';
import { Types } from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Queue } from 'bullmq';

/**
 * ================================
 * CREATE ACTIVITY
 * ================================
 */
export const createActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;
    const { activityType, versionValue } = req.body;

    // ✅ Validation
    if (!versionValue || !activityType) {
      return res.status(400).json({
        success: false,
        message: 'versionValue and activityType are required',
      });
    }

    const files = req.files as Express.Multer.File[];

    if (!files || !files.length) {
      return res.status(400).json({
        success: false,
        message: 'At least one file is required',
      });
    }

    // ✅ Folder path (version → activityType)
    const destinationDir = path.join(
      'uploads',
      organizationId.toString(),
      'activities',
      versionValue,
      activityType
    );

    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
    }

    const createdActivities: any[] = [];

    // ✅ LOOP ALL FILES
    for (const file of files) {
  const newFilePath = path.join(destinationDir, file.filename);

  // move file
  fs.renameSync(file.path, newFilePath);

  // ✅ Check if already exists
  const existingActivity = await activityService.findOneByQuery({
    organizationId: new Types.ObjectId(organizationId),
    versionValue,
    activityType,
    activityFileName: file.originalname, // match by original name
  });

  // ✅ Skip duplicate
  if (existingActivity) {
    console.log(`Skipping duplicate file: ${file.originalname}`);
    continue;
  }

  // ✅ Create DB entry
  const activity = await activityService.createActivity({
    organizationId: new Types.ObjectId(organizationId),
    activityType,
    versionValue,
    activityFileName: file.originalname,
    activityFilePath: newFilePath.replace(/\\/g, '/'),
    analyze_processing_status: 'pending',
  });

  createdActivities.push(activity);
}

    // Send Files to AI
    const aiQueue = new Queue("aiFileQueue", {
      connection: { host: "redis" },
    });

    await aiQueue.add("sendActivityFiles", {
      versionValue,
      activityType
    });

    return res.status(201).json({
      success: true,
      message: 'Activities created successfully',
      data: createdActivities,
      count: createdActivities.length,
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
export const getActivityById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activityId } = req.params;

    const data = await activityService.findActivityById(activityId);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found',
      });
    }

    res.status(200).json({
      success: true,
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
export const updateActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activityId } = req.params;
    const updatePayload: any = { ...req.body };

    const existing = await activityService.findActivityById(activityId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found',
      });
    }

    const { organizationId } = req.user;
    const files = req.files as Express.Multer.File[];

    // ✅ fallback values (important)
    const versionValue = updatePayload.versionValue || existing.versionValue;
    const activityType = updatePayload.activityType || existing.activityType;

    if (files?.length) {
      const file = files[0];

      const destinationDir = path.join(
        'uploads',
        organizationId.toString(),
        'activities',
        versionValue,
        activityType
      );

      if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
      }

      const newFilePath = path.join(destinationDir, file.filename);
      fs.renameSync(file.path, newFilePath);

      // ✅ delete old file (optional but clean)
      if (existing.activityFilePath && fs.existsSync(existing.activityFilePath)) {
        fs.unlinkSync(existing.activityFilePath);
      }

      updatePayload.activityFileName = file.originalname;
      updatePayload.activityFilePath = newFilePath.replace(/\\/g, '/');
    }

    const updated = await activityService.updateActivity(activityId, updatePayload);

     // Send Files to AI
    const aiQueue = new Queue("aiFileQueue", {
      connection: { host: "redis" },
    });

    await aiQueue.add("sendActivityFiles", {
      versionValue,
      activityType
    });

    res.status(200).json({
      success: true,
      message: 'Activity updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ================================
 * DELETE (soft delete only)
 * ================================
 */
export const deleteActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activityId } = req.params;

    const deleted = await activityService.deleteActivity(activityId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Activity deleted successfully',
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
export const getActivityList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId, isSuperUser } = req.user;
    const { activityType, versionValue } = req.query;

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;

    const query: any = { status: 'active' };

    if (!isSuperUser) {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    if (versionValue) {
      query.versionValue = versionValue;
    }

    if (activityType) {
      query.activityType = activityType;
    }

    const result = await activityService.getActivityList({
      query,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (err) {
    next(err);
  }
};