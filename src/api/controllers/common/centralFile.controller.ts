/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { Types } from 'mongoose';
import * as centralFileService from '../../../database/services/common/centralFile.service';
import { findCustomReportById } from '../../../database/services/reportivix/customReport.services';
import { moveCentralFileToMisc, resolveDataSourceId, validateCentralFileForDataSource } from '../../../utils/centralFile.utils';


export const uploadCentralFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportId, year, month, dataSourceId, mappings, separator } = req.body;
    const { organizationId, userId, orgCode } = req.user;

    // ✅ Safe JSON parse
    let allJsonMapping = {};
    let allJsonSeparator = {};

    try {
      allJsonMapping = mappings ? JSON.parse(mappings) : {};
      allJsonSeparator = separator ? JSON.parse(separator) : {};
    } catch (err) {
      console.error('Invalid mapping/separator JSON');
    }

    const files = Array.isArray(req.files) ? req.files : [];

    if (!files.length) {
      return res.status(400).json({ success: false, message: 'File is required' });
    }

    if (!reportId && !dataSourceId) {
      return res.status(400).json({
        success: false,
        message: 'Either reportId or dataSourceId is required',
      });
    }

    // ✅ Always group central files by reportId (best practice)
    const basePath = path.join(
      'uploads',
      organizationId,
      'central-files',
      reportId || dataSourceId || 'MISC',
      year,
      month.toString().padStart(2, '0')
    );

    await fs.mkdir(basePath, { recursive: true });

    // ✅ Load report once
    let customReportData: any = null;
    if (reportId) {
      customReportData = await findCustomReportById(reportId);
    }

    const records: any[] = [];

    for (const file of files) {
      const originalFileName = file.originalname;

      // ============================
      // 1️⃣ VERSIONING LOGIC
      // ============================
      const latestFile = await centralFileService.findLatestCentralFile({
        organizationId,
        reportId: reportId ? new Types.ObjectId(reportId) : undefined,
        year,
        month,
        originalFileName,
      });

      const newVersion = latestFile ? latestFile.version + 1 : 1;

      if (latestFile) {
        await centralFileService.updateCentralFiles(
          {
            organizationId,
            reportId: reportId ? new Types.ObjectId(reportId) : undefined,
            year,
            month,
            originalFileName,
            isLatest: true,
          },
          { isLatest: false }
        );
      }

      const ext = path.extname(originalFileName);
      const base = path.basename(originalFileName, ext);
      const storedFileName =
        newVersion === 1 ? originalFileName : `${base}__v${newVersion}${ext}`;

      const targetPath = path.join(basePath, storedFileName);
      await fs.rename(file.path, targetPath);

      // ============================
      // 2️⃣ CREATE CENTRAL FILE RECORD
      // ============================
      const record: any = await centralFileService.createCentralFile({
        organizationId,
        reportId: reportId || null,
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

      // ============================
      // 3️⃣ RESOLVE DATASOURCE + ENTITY + MAPPING
      // ============================
      const result = await resolveDataSourceId({
        originalFileName,
        dataSourceId,
        customReportData,
        allJsonMapping,
        allJsonSeparator,
      });

      const {
        dataSourceId: finalDataSourceId,
        entityId: finalEntityId,
        mapping: finalMapping,
        separator: finalSeparator,
      } = result;

      let updatedRecord = record;

      // ✅ Update central file with resolved metadata
      if (finalDataSourceId) {
        updatedRecord = await centralFileService.updateCentralFileById(record._id, {
          dataSourceId: finalDataSourceId,
          entityId: finalEntityId || null,
          mapping: finalMapping || null,
          separator: finalSeparator || null,
        });
      }

      // ============================
      // 4️⃣ MOVE TO MISC IF NO DATASOURCE
      // ============================
      if (!finalDataSourceId) {
        // await moveCentralFileToMisc({
        //   centralFile: updatedRecord,
        //   organizationId,
        // });
        updatedRecord = await centralFileService.updateCentralFileById(record._id, {
          validationStatus: 'mapping',
        });
      }

      // ============================
      // 5️⃣ ASYNC VALIDATION (NON-BLOCKING)
      // ============================
      if (
        finalDataSourceId &&
        finalEntityId &&
        finalMapping &&
        Object.keys(finalMapping).length > 0
      ) {
        const centralFileId = updatedRecord._id.toString();

         // ✅ Mark file as processing BEFORE async validation
        updatedRecord = await centralFileService.updateCentralFileById(centralFileId, {
          validationStatus: 'processing',
        });

        setImmediate(async () => {
          try {
            await validateCentralFileForDataSource({
              organizationId,
              userId,
              orgCode,
              centralFileId,
              versionValue: `${year}-${month}`,
            });
          } catch (err) {
            console.error('Central file validation failed:', err);
             // ✅ Optional: mark failed if exception happens
            await centralFileService.updateCentralFileById(centralFileId, {
              validationStatus: 'failed',
            });
          }
        });
      }

      records.push(updatedRecord.toObject());
    }

    return res.status(201).json({
      success: true,
      message: `${records.length} file(s) uploaded successfully`,
      data: records,
    });
  } catch (err) {
    next(err);
  }
};

export const revalidateCentralFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { centralFileId } = req.params;
    const { dataSourceId, mappings, separator } = req.body;
    const { organizationId, userId, orgCode } = req.user;

    if (!centralFileId) {
      return res.status(400).json({
        success: false,
        message: 'centralFileId is required',
      });
    }

    // ✅ Parse mapping & separator safely
    let finalMapping = {};
    let finalSeparator = {};

    try {
      finalMapping = mappings ? JSON.parse(mappings) : {};
      finalSeparator = separator ? JSON.parse(separator) : {};
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mappings or separator JSON',
      });
    }

    // ✅ Fetch central file
    const centralFile = await centralFileService.findCentralFileById(centralFileId);

    if (!centralFile) {
      return res.status(404).json({
        success: false,
        message: 'Central file not found',
      });
    }

    // =====================================================
    // ✅ 👉 PUT THIS CHECK HERE (IMPORTANT)
    // =====================================================
    if (!dataSourceId || !Object.keys(finalMapping).length) {
      await centralFileService.updateCentralFileById(centralFileId, {
        dataSourceId: dataSourceId || null,
        mapping: finalMapping,
        separator: finalSeparator,
        validationStatus: 'mapping', // 🔥 mapping issue
        updatedBy: userId,
      });

      return res.status(422).json({
        success: false,
        message: 'DataSource or mapping not provided',
      });
    }

    // =====================================================
    // ✅ Continue normal re-validation flow
    // =====================================================

    // ✅ Update datasource + mapping + status = processing
    const updatedFile = await centralFileService.updateCentralFileById(centralFileId, {
      dataSourceId: new Types.ObjectId(dataSourceId),
      mapping: finalMapping,
      separator: finalSeparator,
      validationStatus: 'processing',
      updatedBy: userId,
    });

    // ✅ Async validation
    setImmediate(async () => {
      try {
        await validateCentralFileForDataSource({
          organizationId,
          userId,
          orgCode,
          centralFileId,
          versionValue: `${centralFile.year}-${centralFile.month}`,
        });
      } catch (err) {
        console.error('Re-validation failed:', err);

        await centralFileService.updateCentralFileById(centralFileId, {
          validationStatus: 'failed',
        });
      }
    });

    return res.status(200).json({
      success: true,
      message: 'File re-validation started successfully',
      data: updatedFile,
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