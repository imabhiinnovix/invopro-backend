/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { Types } from 'mongoose';
import * as centralFileService from '../../../database/services/common/centralFile.service';

export const uploadCentralFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportId, year, month } = req.body;
    const { organizationId, userId } = req.user;

    const files = Array.isArray(req.files) ? req.files : [];

    if (!files.length) {
      return res.status(400).json({ success: false, message: 'File is required' });
    }

    if (!reportId) {
      return res.status(400).json({ success: false, message: 'Report ID is required' });
    }

    const basePath = path.join(
      'uploads',
      organizationId,
      'central-files',
      reportId,
      year,
      month.toString().padStart(2, '0')
    );

    await fs.mkdir(basePath, { recursive: true });

    const records: any[] = [];

    for (const file of files) {
      const originalFileName = file.originalname;

      // 1️⃣ Find latest version
      const latestFile = await centralFileService.findLatestCentralFile({
        organizationId,
        reportId: new Types.ObjectId(reportId),
        year,
        month,
        originalFileName,
      });

      const newVersion = latestFile ? latestFile.version + 1 : 1;

      // 2️⃣ Mark old latest as false
      if (latestFile) {
        await centralFileService.updateCentralFiles(
          {
            organizationId,
            reportId: new Types.ObjectId(reportId),
            year,
            month,
            originalFileName,
            isLatest: true,
          },
          { isLatest: false }
        );
      }

      // 3️⃣ Create stored file name
      const ext = path.extname(originalFileName);
      const base = path.basename(originalFileName, ext);
      const storedFileName =
        newVersion === 1 ? originalFileName : `${base}__v${newVersion}${ext}`;

      const targetPath = path.join(basePath, storedFileName);
      await fs.rename(file.path, targetPath);

      // 4️⃣ Save DB record
      const record = await centralFileService.createCentralFile({
        organizationId,
        reportId,
        year,
        month,
        originalFileName,
        storedFileName,
        version: newVersion,
        isLatest: true,
        filePath: targetPath,
        fileType: file.mimetype,
        fileSize: file.size,
        createdBy: userId,
        updatedBy: userId,
        validationStatus: 'pending',
      });

      records.push(record);
    }

    res.status(201).json({
      success: true,
      message: `${records.length} file(s) uploaded successfully`,
      data: records,
    });
  } catch (err) {
    next(err);
  }
};

export const getLatestCentralFiles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportId, year, month } = req.query; // ✅ changed
    const { organizationId } = req.user;

    const files = await centralFileService.findCentralFiles({
      organizationId,
      reportId,
      year,
      month,
      isLatest: true,
      validationStatus: 'validated',
    });

    res.status(200).json({
      success: true,
      data: files,
    });
  } catch (err) {
    next(err);
  }
};

export const getCentralFileList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportId, year, month } = req.query; // ✅ changed
    const { organizationId } = req.user;

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const query: any = { organizationId };

    if (reportId) query.reportId = reportId;
    if (year) query.year = Number(year);
    if (month) query.month = Number(month);

    const { data, totalCount } = await centralFileService.getCentralFileList({
      query,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      data,
      totalCount,
    });
  } catch (err) {
    next(err);
  }
};