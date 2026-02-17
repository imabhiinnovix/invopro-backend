/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { Types } from 'mongoose';
import * as centralFileService from '../../../database/services/common/centralFile.service';
import { findCustomReportById } from '../../../database/services/reportivix/customReport.services';
import { moveCentralFileToMisc, resolveDataSourceId, validateCentralFileForDataSource } from '../../../utils/centralFile.utils';
import * as XLSX from 'xlsx';

export const uploadCentralFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportId, year, month, week, dataSourceId, mappings, separator } = req.body;
    const { organizationId, userId, orgCode } = req.user;

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

    const padMonth = String(month).padStart(2, '0');

    const basePath = path.join(
      'uploads',
      organizationId,
      'central-files',
      reportId || dataSourceId || 'MISC',
      year,
      padMonth,
      ...(week ? [`W${week}`] : [])
    );

    await fs.mkdir(basePath, { recursive: true });

    let customReportData: any = null;
    if (reportId) {
      customReportData = await findCustomReportById(reportId);
    }

    const records: any[] = [];

    for (const file of files) {
      const originalFileName = file.originalname;
      const ext = path.extname(originalFileName);
      const base = path.basename(originalFileName, ext);

      const storedFileName = originalFileName;
      const targetPath = path.join(basePath, storedFileName);
      await fs.rename(file.path, targetPath);

      // ============================
      // Detect Sheets
      // ============================
      let sheetNames: any[] = [null];

      if (ext.match(/\.xlsx|\.xls/i)) {
        const workbook = XLSX.readFile(targetPath);
        sheetNames = workbook.SheetNames.length ? workbook.SheetNames : [null];
      }

      // ===================================================
      // ⭐ KSA Contracts Sheet Restriction (Controller level)
      // ===================================================

      if (originalFileName.includes('KSA Contracts')) {

        const currentYear = String(year);
        const previousYear = (Number(year) - 1).toString();

        sheetNames = sheetNames.filter(
          (sheet) =>
            sheet === currentYear ||
            sheet === previousYear
        );

        // If no valid sheet found, skip file entirely
        if (!sheetNames.length) {
          continue;
        }
      }


      for (const sheetName of sheetNames) {

        // ============================
        // VERSIONING PER SHEET
        // ============================

        const latestFile = await centralFileService.findLatestCentralFile({
          organizationId,
          reportId: reportId ? new Types.ObjectId(reportId) : undefined,
          year,
          month,
          week: week || undefined,
          originalFileName,
          sheetName,
        });

        const newVersion = latestFile ? latestFile.version + 1 : 1;

        if (latestFile) {
          await centralFileService.updateCentralFiles(
            {
              organizationId,
              reportId: reportId ? new Types.ObjectId(reportId) : undefined,
              year,
              month,
              week: week || undefined,
              originalFileName,
              sheetName,
              isLatest: true,
            },
            { isLatest: false }
          );
        }

        const versionedStoredFileName =
          newVersion === 1 ? storedFileName : `${base}__v${newVersion}${ext}`;

        // ============================
        // CREATE CENTRAL FILE RECORD
        // ============================

        let record: any = await centralFileService.createCentralFile({
          organizationId,
          reportId: reportId || null,
          year,
          month,
          week,
          sheetName,
          originalFileName,
          storedFileName: versionedStoredFileName,
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
        // Resolve DataSource
        // ============================

        const result = await resolveDataSourceId({
          originalFileName,
          sheetName,
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

        if (finalDataSourceId) {
          record = await centralFileService.updateCentralFileById(record._id, {
            dataSourceId: finalDataSourceId,
            entityId: finalEntityId || null,
            mapping: finalMapping || null,
            separator: finalSeparator || null,
          });
        } else {
          record = await centralFileService.updateCentralFileById(record._id, {
            validationStatus: 'mapping',
          });
        }

        // ============================
        // Async Validation Per Sheet
        // ============================

        if (
          finalDataSourceId &&
          finalEntityId &&
          finalMapping &&
          Object.keys(finalMapping).length > 0
        ) {
          const centralFileId = record._id.toString();

          await centralFileService.updateCentralFileById(centralFileId, {
            validationStatus: 'processing',
          });

          setImmediate(async () => {
            try {
              await validateCentralFileForDataSource({
                organizationId,
                userId,
                orgCode,
                centralFileId,
                versionValue: `${year}-${padMonth}`,
                basePath
              });
            } catch (err) {
              console.error('Central file validation failed:', err);
              await centralFileService.updateCentralFileById(centralFileId, {
                validationStatus: 'failed',
              });
            }
          });
        }

        records.push(record.toObject());
      }
    }

    return res.status(201).json({
      success: true,
      message: `${records.length} record(s) created (sheet-wise)`,
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

    const padCentralFileMonth = String(centralFile.month).padStart(2, '0');

    // ✅ Async validation
    setImmediate(async () => {
      try {
        await validateCentralFileForDataSource({
          organizationId,
          userId,
          orgCode,
          centralFileId,
          versionValue: `${centralFile.year}-${padCentralFileMonth}`,
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