/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';

import * as centralFileImportLogService from '../../../database/services/common/defaultImportLogCentralFile.service';
import * as centralFileErrorService from '../../../database/services/common/dataImportCentralFileError.service';
import * as dataSourceService from '../../../database/services/common/dataSource.services';
import * as attributeOptionService from '../../../database/services/common/attributeOption.services';
import * as centralFileValueService from '../../../database/services/common/defaultCentralFileValue.service';
import * as centralFileService from '../../../database/services/common/centralFile.service';

import {
  formatDateTime,
  getCentralFileSchemaNameBasedOnVersionCodeAndOrgCode,
  getImportLogCentralFileSchemaNameBasedOnVersionCodeAndOrgCode,
  getSchemaNameBasedOnVersionCodeAndOrgCode,
} from '../../../utils/common.utils';

import { validateRowData } from './dataSourceVersion.controller';
import { createDownloadRequest } from '../../../database/services/common/downloadRequest.service';
import { Queue } from 'bullmq';
import { writeValidatedCentralFileExcel } from '../../../utils/centralFile.utils';
import path from 'path';

/* =========================================================
   1️⃣ LIST CENTRAL FILE ERRORS
========================================================= */

export const listCentralFileErrors = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      paginate = true,
      centralFileId,
      dataSourceId,
      sortBy = 'rowNumber',
      sortOrder = 'asc',
      search,
      filters = {},
      type = 'list', // list | export
      selectedFields,
    }: any = req.query;

    // ----------------------------------------------------
    // EXPORT SHORT-CIRCUIT
    // ----------------------------------------------------
    if (type === 'export') {
      return exportCentralFileErrorsToExcel(req, res, next);
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const { orgCode } = req.user;

    if (!centralFileId || !dataSourceId) {
      return res.status(400).json({
        success: false,
        message: 'centralFileId and dataSourceId are required',
      });
    }

    /* --------------------------------------------------
       1️⃣ Base Query
    -------------------------------------------------- */
    const query: any = {
      centralFileId: new Types.ObjectId(centralFileId),
    };

    /* --------------------------------------------------
       2️⃣ Filters
    -------------------------------------------------- */
    let parsedFilters: any = {};
    try {
      parsedFilters =
        typeof filters === 'string' ? JSON.parse(filters) : filters || {};
    } catch {}

    const filterableFields = [
      'errorCode',
      'status',
      'attributeName',
      'fileAttributeValue',
      'fileName',
    ];

    for (const field of filterableFields) {
      const value = parsedFilters[field];
      if (value !== undefined && value !== null && value !== '') {
        query[field] = Array.isArray(value) ? { $in: value } : value;
      }
    }

    /* --------------------------------------------------
       3️⃣ Search (LIKE OLD LOGIC)
    -------------------------------------------------- */
    let searchCondition: any[] = [];

    if (search) {
      const regex = new RegExp(search, 'i');
      searchCondition = [
        { $expr: { $regexMatch: { input: { $toString: '$rowNumber' }, regex } } },
        { errorCode: { $regex: regex } },
        { fileName: { $regex: regex } },
        { errorMessage: { $regex: regex } },
        { attributeName: { $regex: regex } },
        { fileAttributeValue: { $regex: regex } },
        { status: { $regex: regex } },
      ];
    }

    const finalQuery =
      searchCondition.length > 0
        ? { $and: [query, { $or: searchCondition }] }
        : query;

    /* --------------------------------------------------
       4️⃣ Sorting
    -------------------------------------------------- */
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    /* --------------------------------------------------
       5️⃣ Fetch Errors
    -------------------------------------------------- */
    const result =
      paginate === true
        ? await centralFileErrorService.getCentralFileImportErrorList({
            query: finalQuery,
            page,
            limit,
            sort,
          })
        : await centralFileErrorService.getCentralFileImportErrorList({
            query: finalQuery,
            sort,
          });

    /* --------------------------------------------------
       6️⃣ Closed Errors Count
    -------------------------------------------------- */
    const closedQuery = { ...finalQuery, status: { $ne: 'open' } };

    const totalClosedErrors =
      await centralFileErrorService.getCentralFileImportErrorRecordsCount(
        closedQuery
      );

    /* --------------------------------------------------
       7️⃣ Total Uploaded Records (central file import log)
    -------------------------------------------------- */
    const dsDetails = await dataSourceService.findDataSourceById(
      dataSourceId,
      true
    );

    const importLogSchemaName =
      getImportLogCentralFileSchemaNameBasedOnVersionCodeAndOrgCode({
        orgCode,
        versionCode: dsDetails?.code!,
      });

    const totalUploadedRecords =
      await centralFileImportLogService.getCentralFileImportLogCount(
        importLogSchemaName,
        {
          centralFileId: new Types.ObjectId(centralFileId),
        }
      );

    /* --------------------------------------------------
       8️⃣ Response
    -------------------------------------------------- */
    return res.status(200).json({
      success: true,
      message: 'Central File Errors fetched successfully',
      data: result.data,
      pagination: {
        page,
        limit,
        totalRecords: result.totalCount,
        totalPages: Math.ceil(result.totalCount / limit),
      },
      totalCount: result.totalCount,
      totalClosedErrors,
      totalUploadedRecords,
    });
  } catch (err) {
    console.error('Error fetching central file errors:', err);
    next(err);
  }
};


export const exportCentralFileErrorsToExcel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      centralFileId,
      filters,
      search,
      selectedFields,
      dataSourceId,
    } = req.query as {
      centralFileId: string;
      filters?: string;
      search?: string;
      selectedFields?: string[];
      dataSourceId: string;
    };

    const { userId, organizationId, orgCode } = req.user;

    if (!centralFileId || !dataSourceId) {
      return res.status(400).json({
        success: false,
        message: 'centralFileId and dataSourceId are required',
      });
    }

    /* --------------------------------------------------
       1️⃣ Build Query
    -------------------------------------------------- */
    const parsedFilters = filters ? JSON.parse(filters) : {};

    const query: any = {
      centralFileId: new Types.ObjectId(centralFileId),
    };

    const filterableFields = [
      'errorCode',
      'status',
      'attributeName',
      'fileAttributeValue',
      'fileName',
    ];

    for (const field of filterableFields) {
      const value = parsedFilters[field];
      if (value !== undefined && value !== null && value !== '') {
        query[field] = Array.isArray(value) ? { $in: value } : value;
      }
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { errorCode: regex },
        { fileName: regex },
        { errorMessage: regex },
        { attributeName: regex },
        { fileAttributeValue: regex },
      ];
    }

    /* --------------------------------------------------
       2️⃣ Payload for Worker
    -------------------------------------------------- */
    const requestPayload = {
      query,
      page: 1,
      limit: Number.MAX_SAFE_INTEGER,
      sort: {},
      selectedFields:
        selectedFields && selectedFields.length > 0
          ? selectedFields
          : [
              'fileName',
              'fileRowNumber',
              'errorMessage',
              'attributeName',
              'fileAttributeValue',
              'errorCode',
              'status',
            ],
      queryConfig: {
        service: 'centralFileError.services',
        method: 'getCentralFileImportErrorList',
      },
    };

    /* --------------------------------------------------
       3️⃣ Save Download Request
    -------------------------------------------------- */
    const fileName = `Central_File_Errors_${formatDateTime(Date.now())}.xlsx`;

    const downloadRequest = await createDownloadRequest({
      organizationId,
      userId,
      status: 'pending',
      fileName,
      requestPayload,
      type: 'exportCentralFileErrors',
    });

    /* --------------------------------------------------
       4️⃣ Push Job to Queue
    -------------------------------------------------- */
    const downloadQueue = new Queue('downloadQueue', {
      connection: { host: 'redis' },
    });

    await downloadQueue.add('exportCentralFileErrors', {
      downloadRequestId: downloadRequest._id,
    });

    return res.status(200).json({
      success: true,
      message: 'Export job queued successfully.',
      requestId: downloadRequest._id,
    });
  } catch (e) {
    console.error('exportCentralFileErrorsToExcel:', e);
    next(e);
  }
};


/* =========================================================
   2️⃣ GET ROW DATA (RESOLVED ENTITY REFERENCES)
========================================================= */

export const getCentralFileRowData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { centralFileId, dataSourceId, rowNumber }: any = req.query;
    const { orgCode } = req.user;

    const dataSourceDetails: any = await dataSourceService.findDataSourceById(dataSourceId, true);

    const schemaName = getImportLogCentralFileSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: dataSourceDetails.code,
    });

    const data = await centralFileImportLogService.getCentralFileImportLogResolved(
      schemaName,
      {
        centralFileId: new Types.ObjectId(centralFileId),
        rowNumber: Number(rowNumber),
      },
      dataSourceDetails.entityId
    );

    return res.status(200).json({
      success: true,
      data: data?.[0] || null,
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================================
   RESOLVE CENTRAL FILE IMPORT ERRORS
========================================================= */

export const resolveCentralFileImportError = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      action,
      centralFileId,
      dataSourceId,
      rowNumber,
      attributeOptionId,
      fileAttributeValue,
      attributeName,
    } = req.body;

    let { rowData } = req.body;
    const { orgCode } = req.user;

    // ✅ Normalize rowNumber to always be an array
    const rowNumbers = Array.isArray(rowNumber) ? rowNumber : [rowNumber];

    const dataSourceDetails: any = await dataSourceService.findDataSourceById(dataSourceId, true);

    const importLogSchemaName = getImportLogCentralFileSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: dataSourceDetails.code,
    });

    const mainTableSchemaName = getCentralFileSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: dataSourceDetails.code,
    });

    /* =========================================================
       1️⃣ DISCARD (WITH STRICT VALIDATION LIKE YOUR OLD CODE)
    ========================================================= */

    if (action === 'discard') {
      // 1️⃣ Find open error records
      const openRecords = await centralFileErrorService.getCentralFileImportErrorRecords({
        centralFileId,
        rowNumber: { $in: rowNumbers },
        status: 'open',
      });

      const openRowNumbers = [...new Set(openRecords.map((r: any) => r.rowNumber))];

      // 2️⃣ Find invalid rows (no open errors)
      const invalidRowNumbers = rowNumbers.filter((num) => !openRowNumbers.includes(num));

      if (invalidRowNumbers.length > 0) {
        const allErrorRecords = await centralFileErrorService.getCentralFileImportErrorRecords({
          centralFileId,
          rowNumber: { $in: invalidRowNumbers },
        });

        const invalidFileRows = [
          ...new Set(allErrorRecords.map((r: any) => r.fileRowNumber)),
        ];

        return res.status(400).json({
          success: false,
          message: `These row numbers can not be discarded: ${invalidFileRows.join(', ')}`,
        });
      }

      // 3️⃣ Bulk discard
      await Promise.all([
        centralFileErrorService.updateCentralFileImportErrors(
          { centralFileId, rowNumber: { $in: rowNumbers } },
          { status: 'discarded' }
        ),
        centralFileImportLogService.updateCentralFileImportLogRecords(
          importLogSchemaName,
          {
            centralFileId: new Types.ObjectId(centralFileId),
            rowNumber: { $in: rowNumbers },
          },
          {},
          { isErrorLog: 1000 }
        ),
      ]);

      return res.status(200).json({
        success: true,
        message: 'Records discarded successfully.',
      });
    }

    /* =========================================================
       2️⃣ DISCARD ALL + SUBMIT (🔥 YOUR discardAllSubmit LOGIC)
    ========================================================= */

    if (action === 'discardAllSubmit') {
      // discard all open errors
      await centralFileErrorService.updateCentralFileImportErrors(
        { centralFileId, status: 'open' },
        { status: 'discarded' }
      );

      await centralFileImportLogService.updateCentralFileImportLogRecords(
        importLogSchemaName,
        {
          centralFileId: new Types.ObjectId(centralFileId),
          isErrorLog: 1,
        },
        {},
        { isErrorLog: 1000 }
      );

      const validRows = await centralFileImportLogService.getCentralFileImportLogRaw(
        importLogSchemaName,
        {
          centralFileId: new Types.ObjectId(centralFileId),
          isErrorLog: 0,
        }
      );

      if (validRows.length > 0) {
        await centralFileValueService.createCentralFileValue(mainTableSchemaName, validRows);

        await centralFileImportLogService.deleteCentralFileImportLog(
          importLogSchemaName,
          {
            centralFileId: new Types.ObjectId(centralFileId),
            isErrorLog: 0,
          }
        );
        await writeValidatedFileBeforeValidatedStatus({
            centralFileId,
            orgCode,
            dataSourceDetails,
            validRows
          });
      }

      await centralFileService.updateCentralFileById(centralFileId, {
          validationStatus: 'validated',
        });


      return res.status(200).json({
        success: true,
        message: 'All invalid rows discarded and valid data submitted.',
      });
    }

    /* =========================================================
       3️⃣ UPDATE SINGLE FIELD
    ========================================================= */

    if (action === 'update') {
      const entityDetails = dataSourceDetails.entityId as any;

      // 🔹 Filter rowData to only target attribute
      rowData = Object.fromEntries(
        Object.entries(rowData || {}).filter(([key]) => key === attributeName)
      );

      if (Object.keys(rowData).length === 0) {
        return res.status(400).json({
          success: false,
          message: `Attribute "${attributeName}" not found in rowData.`,
        });
      }

      const { isValid, errors, validatedRowData } = await validateRowData({
        rowData,
        attributes: entityDetails.attributes,
      });

      if (!isValid) {
        return res.status(400).json({ success: false, errors });
      }

      const updateFields: any = {};
      for (const [key, value] of Object.entries(validatedRowData)) {
        updateFields[`rowData.${key}`] = value;
      }

      await centralFileImportLogService.updateCentralFileImportLogRecords(
        importLogSchemaName,
        {
          centralFileId: new Types.ObjectId(centralFileId),
          rowNumber: { $in: rowNumbers },
        },
        updateFields,
        { isErrorLog: -1 }
      );

      await centralFileErrorService.updateCentralFileImportErrors(
        {
          centralFileId,
          rowNumber: { $in: rowNumbers },
          attributeName,
          fileAttributeValue,
        },
        { status: 'resolved' }
      );
    }

    /* =========================================================
       4️⃣ ADD OPTION (REFERENCE FIELD)
    ========================================================= */

    if (action === 'addOption') {
      await attributeOptionService.addAttributeValueById(attributeOptionId, fileAttributeValue);

      const optionRecords = await centralFileErrorService.getCentralFileImportErrorRecords({
        centralFileId,
        attributeOptionId,
        fileAttributeValue,
        status: 'open',
      });

      const rowNumbersToUpdate = optionRecords.map((r) => r.rowNumber);

      await centralFileErrorService.updateCentralFileImportErrors(
        {
          centralFileId,
          attributeOptionId,
          fileAttributeValue,
          rowNumber: { $in: rowNumbersToUpdate },
        },
        { status: 'resolved' }
      );

      await centralFileImportLogService.updateCentralFileImportLogRecords(
        importLogSchemaName,
        {
          centralFileId: new Types.ObjectId(centralFileId),
          rowNumber: { $in: rowNumbersToUpdate },
        },
        {},
        { isErrorLog: -1 }
      );
    }

    /* =========================================================
       5️⃣ SUBMIT (ONLY IF NO OPEN ERRORS)
    ========================================================= */

    if (action === 'submit') {
      const openRecords = await centralFileErrorService.getCentralFileImportErrorRecords({
        centralFileId,
        status: 'open',
      });

      if (openRecords.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Some of the records are not resolved.',
        });
      }

      const validRows = await centralFileImportLogService.getCentralFileImportLogRaw(
        importLogSchemaName,
        {
          centralFileId: new Types.ObjectId(centralFileId),
          isErrorLog: 0,
        }
      );

      await centralFileValueService.createCentralFileValue(mainTableSchemaName, validRows);

      await centralFileImportLogService.deleteCentralFileImportLog(
        importLogSchemaName,
        {
          centralFileId: new Types.ObjectId(centralFileId),
          isErrorLog: 0,
        }
      );

      await writeValidatedFileBeforeValidatedStatus({
            centralFileId,
            orgCode,
            dataSourceDetails,
            validRows
          });

      await centralFileService.updateCentralFileById(centralFileId, {
          validationStatus: 'validated',
      });

    }

    /* =========================================================
       6️⃣ UNIQUE ERROR LOGIC (🔥 SAME AS YOUR OLD CODE)
    ========================================================= */

    if (action === 'unique') {
      await centralFileErrorService.updateCentralFileImportErrors(
        { centralFileId, rowNumber: { $in: rowNumbers } },
        { status: 'resolved' }
      );

      await centralFileImportLogService.updateCentralFileImportLogRecords(
        importLogSchemaName,
        {
          centralFileId: new Types.ObjectId(centralFileId),
          rowNumber: { $in: rowNumbers },
        },
        {},
        { isErrorLog: -1 }
      );

      const duplicateRecords = await centralFileErrorService.getCentralFileImportErrorRecords({
        centralFileId,
        fileAttributeValue,
        errorCode: '1005',
        status: 'open',
      });

      const rowNumbersToDiscard = duplicateRecords.map((r) => r.rowNumber);

      await centralFileErrorService.updateCentralFileImportErrors(
        { centralFileId, rowNumber: { $in: rowNumbersToDiscard } },
        { status: 'discarded' }
      );

      await centralFileImportLogService.updateCentralFileImportLogRecords(
        importLogSchemaName,
        {
          centralFileId: new Types.ObjectId(centralFileId),
          rowNumber: { $in: rowNumbersToDiscard },
        },
        {},
        { isErrorLog: 1000 }
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Action applied successfully.',
      data: { centralFileId },
    });
  } catch (err) {
    next(err);
  }
};

async function writeValidatedFileBeforeValidatedStatus({
  centralFileId,
  orgCode,
  dataSourceDetails,
  validRows
}: any) {

  const centralFile: any =
    await centralFileService.findCentralFileById(centralFileId);

  if (!centralFile) return;

  if (!validRows?.length) return;
console.log('validRows?.length',validRows?.length);
  // 🔹 Build base path using central file structure
  const year = String(centralFile.year);
  const month = String(centralFile.month).padStart(2, '0');
  const week = centralFile.week ? `W${centralFile.week}` : null;

  const basePath = week
    ? path.join(
        'uploads',
        centralFile.organizationId.toString(),
        'central-files',
        centralFile.dataSourceId.toString(),
        year,
        month,
        week
      )
    : path.join(
        'uploads',
        centralFile.organizationId.toString(),
        'central-files',
        centralFile.dataSourceId.toString(),
        year,
        month
      );
console.log('validRows',validRows);
  await writeValidatedCentralFileExcel({
    basePath,
    originalFileName: centralFile.originalFileName,
    mapping: centralFile.mapping || {},
    rowsWithMeta: validRows,
  });
}

