/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import * as engagementLetterService from '../../../database/services/invoicivixVendor/engagementLetter.service';
import { Types } from 'mongoose';
import fs from 'fs';
import path from 'path';

/**
 * ================================
 * CREATE ENGAGEMENT LETTER
 * ================================
 */
export const createEngagementLetter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId } = req.user;

    const {
      vendorId,
      referenceNumber,
      description,
      startDate,
      endDate,
      status,
    } = req.body;

    if (!vendorId) {
        return res.status(400).json({ success: false, message: 'Vendor Id is mandatory' });
    }

    // Check duplicate reference number
    const existing = await engagementLetterService.findOneByQuery({
    organizationId,
    vendorId,
    referenceNumber,
    });

    if (existing) {
    return res.status(400).json({
        success: false,
        message: 'Engagement Letter with same reference number already exists',
    });
    }

    let fileName = '';
    let filePath = '';

    const files = req.files as Express.Multer.File[];

    if (files?.length) {
    const file = files[0];
    fileName = file.originalname;

    const uploadRoot = 'uploads';

    const destinationDir = path.join(
        uploadRoot,
        organizationId.toString(),
        'vendors',
        vendorId,
        'engagement_letters'
    );

    // Create folder if not exists
    if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
    }

    const newFilePath = path.join(destinationDir, file.filename);

    // Move file
    fs.renameSync(file.path, newFilePath);

    filePath = `${process.env.BASE_BACKEND_URL}/${newFilePath.replace(/\\/g, '/')}`;
    }

    const engagementLetter = await engagementLetterService.createEngagementLetter({
      organizationId,
      vendorId: new Types.ObjectId(vendorId),
      referenceNumber,
      description,
      startDate,
      endDate,
      engagementLetterFileName: fileName,
      engagementLetterFilePath: filePath,
      status,
    });

    res.status(201).json({
      success: true,
      message: 'Engagement Letter created successfully',
      data: engagementLetter,
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
export const getEngagementLetterById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { engagementLetterId } = req.params;

    const data = await engagementLetterService.findEngagementLetterById(
      engagementLetterId,
      [{ path: 'vendorId', select: 'name code' }]
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Engagement Letter not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Engagement Letter fetched successfully',
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
export const updateEngagementLetter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { engagementLetterId } = req.params;

    const updatePayload: any = {
      ...req.body,
    };

    const files = req.files as Express.Multer.File[];

    if (files?.length) {
    const file = files[0];

    const vendorId = updatePayload.vendorId || req.body.vendorId;

    const uploadRoot = 'uploads';

    const destinationDir = path.join(
        uploadRoot,
        req.user.organizationId.toString(),
        'vendors',
        vendorId,
        'engagement_letters'
    );

    if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
    }

    const newFilePath = path.join(destinationDir, file.filename);

    fs.renameSync(file.path, newFilePath);

    updatePayload.engagementLetterFileName = file.originalname;
    updatePayload.engagementLetterFilePath =
        `${process.env.BASE_BACKEND_URL}/${newFilePath.replace(/\\/g, '/')}`;
    }

    if (updatePayload.vendorId) {
      updatePayload.vendorId = new Types.ObjectId(updatePayload.vendorId);
    }

    const updated = await engagementLetterService.updateEngagementLetter(
      engagementLetterId,
      updatePayload
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Engagement Letter not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Engagement Letter updated successfully',
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
export const deleteEngagementLetter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { engagementLetterId } = req.params;

    const deleted = await engagementLetterService.deleteEngagementLetter(
      engagementLetterId
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Engagement Letter not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Engagement Letter deleted successfully',
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
export const getEngagementLetterList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search, vendorId } = req.query;
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

    if (search) {
      query.referenceNumber = { $regex: search, $options: 'i' };
    }

    const result = await engagementLetterService.getEngagementLetterList({
      query,
      page,
      limit,
      populate: [{ path: 'vendorId', select: 'name code' }],
    });

    res.status(200).json({
      success: true,
      message: 'Engagement Letters fetched successfully',
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (err) {
    next(err);
  }
};