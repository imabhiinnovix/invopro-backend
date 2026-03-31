import { Request, Response, NextFunction } from 'express';
import * as dataImportErrorServices from '../../../database/services/common/dataImportError.services';
import {
  formatDateTime,
  getImportLogSchemaNameBasedOnVersionCodeAndOrgCode,
  getSchemaNameBasedOnVersionCodeAndOrgCode,
} from '../../../utils/common.utils';
import * as dataSourceService from '../../../database/services/common/dataSource.services';
import * as importLogDataSourceVersionValueService from '../../../database/services/common/defaultImportLogDataSourceVersionValue.services';
import mongoose, { Types } from 'mongoose';
import * as attributeOptionService from '../../../database/services/common/attributeOption.services';
import * as dataSourceVersionValueService from '../../../database/services/common/defaultDataSourceVersionValue.services';
import { updateCustomDataSourceVersionIsCurrentFunction, validateRowData, handleReferenceSubFields } from './dataSourceVersion.controller';
import { getAttributeByName } from '../../../utils/entity.utils';
import { getDataSourceVersion } from '../../../database/services/common/dataSourceVersion.services';
import { autoPopulateAttributeOptionFromRow } from '../../../utils/attributeOption.utils';
import { createDownloadRequest } from '../../../database/services/common/downloadRequest.service';
import { Queue } from 'bullmq';
const ObjectId = mongoose.Types.ObjectId;

// export const listDataSourceVersionErrorBasedOnDataSourceVersionId = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const {
//       paginate = "false",
//       dataSourceVersionId,
//       dataSourceId,
//       sortBy = "rowNumber",
//       sortOrder = "asc",
//       search,
//       searchFields = [],
//       filters = {},
//     }: any = req.query;

//     const page = parseInt(req.query.page as string, 10) || 1;
//     const limit = parseInt(req.query.limit as string, 10) || 10;
//     const { orgCode } = req.user;

//     // ✅ Base query
//     const query: any = { dataSourceVersionId };
//     // Parse filters safely (GET query sends them as string)
//     let parsedFilters: Record<string, any> = {};
//     if (filters) {
//       try {
//         if (typeof filters === "string") {
//           parsedFilters = JSON.parse(filters);
//         } else if (typeof filters === "object") {
//           parsedFilters = filters;
//         }
//       } catch (err) {
//         console.warn("Invalid filters format, ignoring filters:", filters);
//       }
//     }    
//     // ✅ Apply filters (with multi-value $in support)
//     if (parsedFilters && typeof parsedFilters === "object") {
//       const filterableFields = [
//         "errorCode",
//         "status",
//         "fileName",
//         "attributeName",
//         "fileAttributeValue",
//       ];

//       for (const field of filterableFields) {
//         const value = parsedFilters[field];
//         if (value !== undefined && value !== null && value !== "") {
//           if (Array.isArray(value)) {
//             query[field] = { $in: value };
//           } else {
//             query[field] = value;
//           }
//         }
//       }
//     }

//     // ✅ Build search conditions (to apply within filtered data)
//     let searchCondition: any[] = [];

//     if (search) {
//       const regex = new RegExp(search as string, "i");
//       const defaultSearchFields = [
//         { $expr: { $regexMatch: { input: { $toString: "$rowNumber" }, regex } } },
//         { errorCode: { $regex: regex } },
//         { fileName: { $regex: regex } },
//         { errorMessage: { $regex: regex } },
//         { fileAttributeValue: { $regex: regex } },
//         { status: { $regex: regex } },
//       ];

//       searchCondition.push(...defaultSearchFields);

//       // ✅ Include dynamic fields if not already covered
//       if (Array.isArray(searchFields) && searchFields.length > 0) {
//         for (const field of searchFields) {
//           if (!defaultSearchFields.some((obj) => Object.keys(obj)[0] === field)) {
//             searchCondition.push({ [field]: { $regex: regex } });
//           }
//         }
//       }
//     }

//     // ✅ Combine filters + search
//     const finalQuery =
//       searchCondition.length > 0
//         ? { $and: [query, { $or: searchCondition }] }
//         : query;

//     // ✅ Sorting
//     const sort: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
//     let result: any = {};
//     if (paginate === "true") {
//       result = await dataImportErrorServices.getDataSourceVersionErrrorList({
//         query: finalQuery,
//         page,
//         limit,
//         sort,
//       });
//     } else {
//       result = await dataImportErrorServices.getDataSourceVersionErrrorList({
//         query: finalQuery,
//         sort,
//       });
//     }

//     // ✅ Count non-open errors
//     const closedQuery = { ...finalQuery, status: { $ne: "open" } };
//     const totalActionCount = await dataImportErrorServices.getDataImportErrorRecordsCount(closedQuery);

//     // ✅ Get total uploaded records
//     const dataSourceDetails = await dataSourceService.findDataSourceById(dataSourceId, true);
//     const errorSchemaName = getImportLogSchemaNameBasedOnVersionCodeAndOrgCode({
//       orgCode,
//       versionCode: dataSourceDetails?.code!,
//     });

//     const totalUploadedRecords =
//       await importLogDataSourceVersionValueService.getDataSourceVersionValueCount(
//         errorSchemaName,
//         { dataSourceVersionId: new ObjectId(dataSourceVersionId) }
//       );

//     // ✅ Final response
//     res.status(200).json({
//       success: true,
//       message: "Data Import Error Fetched Successfully",
//       data: result.data,
//       pagination: {
//         page,
//         limit,
//         totalPage: Math.ceil(result.totalCount / limit),
//         totalRecords: result.totalCount,
//       },
//       totalCount: result.totalCount,
//       totalActionCount,
//       totalUploadedRecords,
//     });
//   } catch (err) {
//     console.error(`[${new Date().toISOString()}] Error fetching data import errors:`, err);
//     next(err);
//   }
// };

export const listDataSourceVersionErrorBasedOnDataSourceVersionId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      paginate = true,
      dataSourceVersionId,
      dataSourceId,
      reportRequestId,
      sortBy = "rowNumber",
      sortOrder = "asc",
      search,
      searchFields = [],
      filters = {},
      type = "list", // list | export
      selectedFields
    }: any = req.query;

    // ----------------------------------------------------
    // EXPORT SHORT-CIRCUIT
    // ----------------------------------------------------
    if (type === "export") {
      return exportDataSourceVersionErrorToExcel(req, res, next);
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const { orgCode } = req.user;

    /* --------------------------------------------------
       1️ Resolve datasourceVersionIds
    -------------------------------------------------- */
    let dataSourceVersionIds: Types.ObjectId[] = [];
    const dataSourceVersionsMap = new Map<string, Types.ObjectId[]>();

    let customReport: any = null;

    if (dataSourceVersionId) {
      dataSourceVersionIds = [new ObjectId(dataSourceVersionId)];
    } 
    // else if (reportRequestId) {
    //   const reportRequest: any = await findReportRequestById(reportRequestId);
    //   customReport =
    //     await findCustomReportById(reportRequest?.customReportId);

    //   if (!customReport?.dataSourceIds?.length) {
    //     return res.status(200).json({
    //       success: true,
    //       message: "No datasource found for custom report",
    //       data: [],
    //       totalCount: 0,
    //       totalActionCount: 0,
    //       totalUploadedRecords: 0,
    //     });
    //   }

    //   for (const ds of customReport.dataSourceIds) {
    //     const versionId: any =
    //       await getDataSourceVersion({
    //                           query: {
    //                             dataSourceId: ds.dataSourceId,
    //                             versionValue: reportRequest?.versionValue,
    //                             status: { $in : ["failed", "partially-completed"] },
    //                             isActive: true,
    //                             reportRequestId
    //                           },
    //                           sort: { createdAt: -1 }, // LATEST
    //                         });

    //     dataSourceVersionsMap.set(ds.dataSourceId.toString(), versionId);
    //     dataSourceVersionIds.push(versionId);
    //   }
    // }

    /* --------------------------------------------------
       2️ Base query
    -------------------------------------------------- */
    const query: any = {};
    if (dataSourceVersionIds.length) {
      query.dataSourceVersionId = { $in: dataSourceVersionIds };
    }

    /* --------------------------------------------------
       3️ Filters
    -------------------------------------------------- */
    let parsedFilters: any = {};
    try {
      parsedFilters =
        typeof filters === "string" ? JSON.parse(filters) : filters || {};
    } catch {}

    const filterableFields = [
      "errorCode",
      "status",
      "fileName",
      "attributeName",
      "fileAttributeValue",
    ];

    for (const field of filterableFields) {
      const value = parsedFilters[field];
      if (value !== undefined && value !== null && value !== "") {
        query[field] = Array.isArray(value) ? { $in: value } : value;
      }
    }

    /* --------------------------------------------------
       4️ Search
    -------------------------------------------------- */
    let searchCondition: any[] = [];

    if (search) {
      const regex = new RegExp(search, "i");
      searchCondition = [
        { $expr: { $regexMatch: { input: { $toString: "$rowNumber" }, regex } } },
        { errorCode: { $regex: regex } },
        { fileName: { $regex: regex } },
        { errorMessage: { $regex: regex } },
        { fileAttributeValue: { $regex: regex } },
        { status: { $regex: regex } },
      ];
    }

    const finalQuery =
      searchCondition.length
        ? { $and: [query, { $or: searchCondition }] }
        : query;

    /* --------------------------------------------------
       5️ Fetch errors
    -------------------------------------------------- */
    const sort: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const result =
      paginate === true
        ? await dataImportErrorServices.getDataSourceVersionErrrorList({
            query: finalQuery,
            page,
            limit,
            sort,
          })
        : await dataImportErrorServices.getDataSourceVersionErrrorList({
            query: finalQuery,
            sort,
          });

    /* --------------------------------------------------
       6️ Closed errors count
    -------------------------------------------------- */
    const closedQuery = { ...finalQuery, status: { $ne: "open" } };
    const totalActionCount =
      await dataImportErrorServices.getDataImportErrorRecordsCount(
        closedQuery
      );

    /* --------------------------------------------------
       7️ Uploaded records count (ONE QUERY PER DATASOURCE)
    -------------------------------------------------- */
    let totalUploadedRecords = 0;

    if (dataSourceId && dataSourceVersionId) {
      const dsDetails =
        await dataSourceService.findDataSourceById(dataSourceId, true);

      const schemaName =
        getImportLogSchemaNameBasedOnVersionCodeAndOrgCode({
          orgCode,
          versionCode: dsDetails?.code!,
        });

      totalUploadedRecords =
        await importLogDataSourceVersionValueService.getDataSourceVersionValueCount(
          schemaName,
          { dataSourceVersionId: new ObjectId(dataSourceVersionId) }
        );
    } 
    // else if (reportRequestId && customReport) {
    //   for (const ds of customReport.dataSourceIds) {
    //     const dsDetails =
    //       await dataSourceService.findDataSourceById(ds.dataSourceId, true);
    //     if (!dsDetails) continue;

    //     const schemaName =
    //       getImportLogSchemaNameBasedOnVersionCodeAndOrgCode({
    //         orgCode,
    //         versionCode: dsDetails.code,
    //       });

    //     const versionId =
    //       dataSourceVersionsMap.get(ds.dataSourceId.toString()) || '';

    //     if (versionId) {
    //       totalUploadedRecords +=
    //         await importLogDataSourceVersionValueService.getDataSourceVersionValueCount(
    //           schemaName,
    //           { dataSourceVersionId: versionId }
    //         );
    //     }
    //   }
    // }

    /* --------------------------------------------------
       8️⃣ Response
    -------------------------------------------------- */
    res.status(200).json({
      success: true,
      message: "Data Import Error Fetched Successfully",
      data: result.data,
      pagination: {
        page,
        limit,
        totalPage: Math.ceil(result.totalCount / limit),
        totalRecords: result.totalCount,
      },
      totalCount: result.totalCount,
      totalActionCount,
      totalUploadedRecords,
    });
  } catch (err) {
    console.error("Error fetching data import errors:", err);
    next(err);
  }
};

export const exportDataSourceVersionErrorToExcel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      dataSourceVersionId,
      filters,
      search,
      selectedFields,
      reportRequestId
    } = req.query as {
      dataSourceVersionId: string;
      filters?: string;
      search?: string;
      selectedFields?: string[];
      reportRequestId: string;
    };

    const { userId, organizationId } = req.user;

    // --------------------------------------------------------------------
    // BUILD QUERY COMPLETELY HERE
    // --------------------------------------------------------------------
    const parsedFilters = filters ? JSON.parse(filters) : {};
    
    if (!reportRequestId && !dataSourceVersionId) {
      return res.status(400).json({
        success: false,
        message: "Either reportRequestId or dataSourceVersionId is required",
      });
    }
    
    let dataSourceVersionIds: Types.ObjectId[] = [];

  // -------------------------------
  // CUSTOM REPORT FLOW
  // -------------------------------
  // if (reportRequestId) {
  //   const reportRequest: any = await findReportRequestById(reportRequestId);
  //   const customReport: any = await findCustomReportById(
  //     reportRequest?.customReportId
  //   );

  //   if (!customReport?.dataSourceIds?.length) {
  //     return new Map();
  //   }

  //   for (const ds of customReport.dataSourceIds) {
  //     const version: any = await getDataSourceVersion({
  //       query: {
  //         dataSourceId: ds.dataSourceId,
  //         versionValue: reportRequest?.versionValue,
  //         status: "failed",
  //         isActive: true,
  //         reportRequestId
  //       },
  //       sort: { createdAt: -1 },
  //     });

  //     if (version) {
  //       dataSourceVersionIds.push(version._id);
  //     }
  //   }
  // }else{
    dataSourceVersionIds = [new Types.ObjectId(dataSourceVersionId)];
  // }

  // -------------------------------
  // ERROR QUERY
  // -------------------------------
  const query: any = {
    dataSourceVersionId: { $in: dataSourceVersionIds },
  };

    const filterableFields = [
      "errorCode",
      "status",
      "fileName",
      "attributeName",
      "fileAttributeValue",
    ];

    for (const field of filterableFields) {
      const value = parsedFilters[field];
      if (value !== undefined && value !== null && value !== "") {
        query[field] = Array.isArray(value) ? { $in: value } : value;
      }
    }

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { errorCode: regex },
        { fileName: regex },
        { errorMessage: regex },
        { fileAttributeValue: regex },
      ];
    }

    // --------------------------------------------------------------------
    // PAYLOAD (MINIMAL & GENERIC)
    // --------------------------------------------------------------------
    const requestPayload = {
      query,
      page: 1,
      limit: Number.MAX_SAFE_INTEGER,
      sort: {},
      selectedFields: selectedFields && selectedFields?.length > 0 ? selectedFields : ['fileName', 'fileRowNumber', 'errorMessage', 'fileAttributeName', 'fileAttributeValue', 'errorType', 'status'],
      queryConfig: {
        service: "dataImportError.services",
        method: "getDataSourceVersionErrrorList",
      },
    };

    // --------------------------------------------------------------------
    // SAVE DOWNLOAD REQUEST
    // --------------------------------------------------------------------
    const fileName = `Import_Errors_${formatDateTime(Date.now())}.xlsx`;

    const downloadRequest = await createDownloadRequest({
      organizationId,
      userId,
      status: "pending",
      fileName,
      requestPayload,
      type: "exportCustomData",
    });

    // --------------------------------------------------------------------
    // PUSH JOB INTO QUEUE
    // --------------------------------------------------------------------
    const downloadQueue = new Queue("downloadQueue", {
      connection: { host: "redis" },
    });

    await downloadQueue.add("exportCustomData", {
      downloadRequestId: downloadRequest._id,
    });

    return res.status(200).json({
      success: true,
      message: "Export job queued successfully.",
      requestId: downloadRequest._id,
    });
  } catch (e) {
    console.error("exportDataSourceVersionErrorToExcel:", e);
    next(e);
  }
};



// export const resolveDataImportError = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const {
//       action,
//       rowNumber,
//       dataSourceVersionId,
//       dataSourceId,
//       attributeOptionId,
//       fileAttributeValue,
//       attributeName,
//     } = req.body;
//     let { rowData } = req.body;
//     const { orgCode, userId, organizationId } = req.user;

//     // ✅ Normalize rowNumber to always be an array
//     const rowNumbers = Array.isArray(rowNumber) ? rowNumber : [rowNumber];

//     const dataSourceDetails = await dataSourceService.findDataSourceById(dataSourceId, true);
//     const errorSchemaName = getImportLogSchemaNameBasedOnVersionCodeAndOrgCode({
//       orgCode,
//       versionCode: dataSourceDetails?.code!,
//     });

//     const mainTableSchemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
//       orgCode,
//       versionCode: dataSourceDetails?.code!,
//     });
//     if (action === 'discard') {
//   // 1️ Check which rows have at least one open record
//   const openRecords = await dataImportErrorServices.getDataImportErrorRecords({
//     dataSourceVersionId,
//     rowNumber: { $in: rowNumbers },
//     status: 'open',
//   });

//   const openRowNumbers = [...new Set(openRecords.map((r: any) => r.rowNumber))];
//   // 2️ Find invalid rows (no open record)
//   const invalidRowNumbers = rowNumbers.filter(
//     (num) => !openRowNumbers.includes(num)
//   );
//   if (invalidRowNumbers.length > 0) {
//     // 4️ Get their corresponding fileRowNumbers from all error records (for better user clarity)
//     const allErrorRecords = await dataImportErrorServices.getDataImportErrorRecords({
//       dataSourceVersionId,
//       rowNumber: { $in: invalidRowNumbers },
//     });
//     const invalidFileRows = [...new Set(
//       allErrorRecords.map((r: any) => r.fileRowNumber)
//     )];


//     return res.status(400).json({
//       success: false,
//       message: `These row numbers can not be discarded: ${invalidFileRows.join(', ')}`,
//     });

//   }

//   // 3️ Proceed with bulk discard (no status filter now)
//   await Promise.all([
//     dataImportErrorServices.updateDataImportErrors(
//       { dataSourceVersionId, rowNumber: { $in: rowNumbers } },
//       { status: 'discarded' }
//     ),
//     importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
//       errorSchemaName,
//       {
//         dataSourceVersionId: new ObjectId(dataSourceVersionId),
//         rowNumber: { $in: rowNumbers },
//       },
//       { isErrorLog: 1000 }
//     ),
//   ]);

//   return res.status(200).json({
//     success: true,
//     message: 'Records discarded successfully.',
//   });
// }else if (action === 'discardAllSubmit') {
//       await dataImportErrorServices.updateDataImportErrors(
//         {
//           dataSourceVersionId: dataSourceVersionId,
//           status: 'open',
//         },
//         {
//           status: 'discarded',
//         }
//       );
//       await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
//         errorSchemaName,
//         {
//           dataSourceVersionId: new ObjectId(dataSourceVersionId),
//           isErrorLog: 1,
//         },
//         {
//           isErrorLog: 1000,
//         }
//       );
//       let allProcessedVersionValue = await importLogDataSourceVersionValueService.getImportLogDataSourceVersionValues(
//         errorSchemaName,
//         {
//           dataSourceVersionId: new ObjectId(dataSourceVersionId),
//           isErrorLog: 0,
//         }
//       );
//       // const entityDetails = dataSourceDetails?.entityId as any;
//       // const attributes = entityDetails?.attributes || [];
//       // const uniqueAttributeRules = dataSourceDetails?.uniqueAttributeRules || [];

//       // if (uniqueAttributeRules.length > 0 && allProcessedVersionValue.length > 0) {
//       //   // ✅ build quick lookup map from attributeId → attributeName
//       //   const attributeIdToNameMap = attributes.reduce(
//       //     (acc, attr) => {
//       //       acc[attr._id.toString()] = attr.name;
//       //       return acc;
//       //     },
//       //     {} as Record<string, string>
//       //   );
//       //   const seenKeys = new Set<string>();
//       //   const validRows: any[] = [];
//       //   const duplicateRowNumbers: number[] = [];

//       //   for (const row of allProcessedVersionValue) {
//       //     let compositeKey = '';

//       //     for (const rule of uniqueAttributeRules) {
//       //       const keyValues: string[] = [];
//       //       let validRule = true;

//       //       for (const attrId of rule) {
//       //         const attrName = attributeIdToNameMap[attrId.toString()];
//       //         if (!attrName) {
//       //           validRule = false;
//       //           break;
//       //         }

//       //         const val = row.rowData?.[attrName];
//       //         if (val === undefined || val === null || val === '') {
//       //           validRule = false;
//       //           break;
//       //         }

//       //         keyValues.push(String(val).toLowerCase().trim());
//       //       }

//       //       if (validRule) {
//       //         compositeKey = keyValues.join('|');
//       //         break;
//       //       }
//       //     }

//       //     if (compositeKey) {
//       //       if (seenKeys.has(compositeKey)) {
//       //         duplicateRowNumbers.push(row.rowNumber);
//       //       } else {
//       //         seenKeys.add(compositeKey);
//       //         validRows.push(row);
//       //       }
//       //     } else {
//       //       // no valid composite key → just keep row
//       //       validRows.push(row);
//       //     }
//       //   }

//       //   // ✅ discard duplicates
//       //   if (duplicateRowNumbers.length > 0) {
//       //     await dataImportErrorServices.updateDataImportErrors(
//       //       {
//       //         dataSourceVersionId,
//       //         rowNumber: { $in: duplicateRowNumbers },
//       //       },
//       //       { status: 'discarded' }
//       //     );

//       //     await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
//       //       errorSchemaName,
//       //       {
//       //         dataSourceVersionId: new ObjectId(dataSourceVersionId),
//       //         rowNumber: { $in: duplicateRowNumbers },
//       //       },
//       //       { isErrorLog: 1000 }
//       //     );
//       //   }

//       //   allProcessedVersionValue = validRows;
//       // }

//       if (allProcessedVersionValue.length > 0) {
//         await dataSourceVersionValueService.createDataSourceVersionValue(mainTableSchemaName, allProcessedVersionValue);
//         await importLogDataSourceVersionValueService.deleteImportLogDataSourceVersionValues(errorSchemaName, {
//           dataSourceVersionId: new ObjectId(dataSourceVersionId),
//           isErrorLog: 0,
//         });
//       }

//       await updateCustomDataSourceVersionIsCurrentFunction({ dataSourceVersionId });
//     } else if (action === 'update') {

//       // const updateFields: any = {};
//       const entityDetails = dataSourceDetails?.entityId as any;
//       // for (const [key, value] of Object.entries(rowData)) {
//       //   const attribute: any = await getAttributeByName(entityDetails, key);
//       //   if(attribute.type == 'date' || attribute.type == 'date-range' && value){
//       //     updateFields[`rowData.${key}`] = new Date(value as string);
//       //   }else{
//       //     updateFields[`rowData.${key}`] = value;
//       //   }
//       // }
      
//       // await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
//       //   errorSchemaName,
//       //   {
//       //     dataSourceVersionId: new ObjectId(dataSourceVersionId),
//       //     rowNumber: rowNumber,
//       //   },
//       //   updateFields, // ✅ only update given keys inside rowData
//       //   {
//       //     isErrorLog: -1,
//       //   }
//       // );
//     // 🔹 Filter rowData to only keep the target attributeName
//     rowData = Object.fromEntries(
//       Object.entries(rowData || {}).filter(([key]) => key === attributeName)
//     );

//     // Ensure the attribute exists in rowData
//     if (Object.keys(rowData).length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: `Attribute "${attributeName}" not found in rowData.`,
//       });
//     }

//     await autoPopulateAttributeOptionFromRow({
//       entityId: entityDetails?._id,
//       attributes: entityDetails.attributes,
//       rowData,
//       userId,
//       organizationId,
//     });

//     const { isValid, errors, validatedRowData } = await validateRowData({
//       rowData,
//       attributes: entityDetails.attributes,
//     });

//     if (!isValid) {
//       return res.status(400).json({ success: false, errors });
//     }
//     const updateFields: any = {};
//     for (const [key, value] of Object.entries(validatedRowData)) {
//         updateFields[`rowData.${key}`] = value;
//     }
//     await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
//         errorSchemaName,
//         {
//           dataSourceVersionId: new ObjectId(dataSourceVersionId),
//           rowNumber: { $in: rowNumbers },
//         },
//         updateFields, // ✅ only update given keys inside rowData
//         {
//           isErrorLog: -1,
//         }
//     );

//     let version = await getDataSourceVersion({
//       query: {_id: dataSourceVersionId}
//     });

//     // 🔹 Handle reference subfields
//     await handleReferenceSubFields({
//       rowData: validatedRowData,
//       attributes: entityDetails.attributes,
//       dataSourceId,
//       versionId: version?._id,
//       versionValue: version?.versionValue,
//       userId,
//       organizationId,
//     });

//       await dataImportErrorServices.updateDataImportErrors(
//         { 
//           dataSourceVersionId: dataSourceVersionId, 
//           rowNumber: { $in: rowNumbers },
//           attributeName,
//           fileAttributeValue,
//         },
//         { status: 'resolved' }
//       );
//     } else if (action === 'addOption') {
//       await attributeOptionService.addAttributeValueById(attributeOptionId, fileAttributeValue);

//       const optionRecords = await dataImportErrorServices.getDataImportErrorRecords({
//         dataSourceVersionId: dataSourceVersionId,
//         attributeOptionId,
//         fileAttributeValue,
//         status: 'open',
//       });

//       const rowNumbersToUpdate = optionRecords.map((record) => record.rowNumber);

//       console.log('rowNumbersToUpdate', rowNumbersToUpdate);
//       await dataImportErrorServices.updateDataImportErrors(
//         {
//           dataSourceVersionId: dataSourceVersionId,
//           attributeOptionId,
//           fileAttributeValue,
//           rowNumber: { $in: rowNumbersToUpdate },
//         },
//         { status: 'resolved' }
//       );

//       await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
//         errorSchemaName,
//         { dataSourceVersionId: new ObjectId(dataSourceVersionId), rowNumber: { $in: rowNumbersToUpdate } },
//         {},
//         {
//           isErrorLog: -1,
//         }
//       );
//     } else if (action === 'submit') {
//       const openRecords = await dataImportErrorServices.getDataImportErrorRecords({
//         dataSourceVersionId: dataSourceVersionId,
//         status: 'open',
//       });
//       if (openRecords && openRecords.length > 0) {
//         return res.status(400).json({ message: 'Some of the record has not been resolved.' });
//       }

//       const allProcessedVersionValue = await importLogDataSourceVersionValueService.getImportLogDataSourceVersionValues(
//         errorSchemaName,
//         {
//           dataSourceVersionId: new ObjectId(dataSourceVersionId),
//           isErrorLog: 0,
//         }
//       );

//       await dataSourceVersionValueService.createDataSourceVersionValue(mainTableSchemaName, allProcessedVersionValue);
//       await importLogDataSourceVersionValueService.deleteImportLogDataSourceVersionValues(errorSchemaName, {
//         dataSourceVersionId: new ObjectId(dataSourceVersionId),
//         isErrorLog: 0,
//       });
//       await updateCustomDataSourceVersionIsCurrentFunction({ dataSourceVersionId });
//     } else if (action === 'unique') {
//       await dataImportErrorServices.updateDataImportErrors(
//         { dataSourceVersionId: dataSourceVersionId, rowNumber: { $in: rowNumbers } },
//         { status: 'resolved' }
//       );
//       await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
//         errorSchemaName,
//         { dataSourceVersionId: new ObjectId(dataSourceVersionId), rowNumber: { $in: rowNumbers } },
//         {},
//         {
//           isErrorLog: -1,
//         }
//       );

//       const dublicateRecords = await dataImportErrorServices.getDataImportErrorRecords({
//         dataSourceVersionId: dataSourceVersionId,
//         fileAttributeValue: fileAttributeValue,
//         errorCode: '1005',
//         status: 'open',
//       });

//       const rowNumbersToUpdate = dublicateRecords.map((record) => record.rowNumber);

//       await dataImportErrorServices.updateDataImportErrors(
//         {
//           dataSourceVersionId: dataSourceVersionId,
//           rowNumber: { $in: rowNumbersToUpdate },
//         },
//         { status: 'discarded' }
//       );
//       await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
//         errorSchemaName,
//         {
//           dataSourceVersionId: new ObjectId(dataSourceVersionId),
//           rowNumber: { $in: rowNumbersToUpdate },
//         },
//         {
//           isErrorLog: 1000,
//         }
//       );
//     } else {
//       return res.status(400).json({ success: false, message: 'Not valid action.' });
//     }
//     return res.status(200).json({ success: true, message: 'Action Applied.', data: { dataSourceId } });
//   } catch (err) {
//     next(err);
//   }
// };

async function getGroupedErrorContext({
  reportRequestId,
  dataSourceId,
  dataSourceVersionId,
  rowNumbers,
}: {
  reportRequestId?: string;
  dataSourceId?: string;
  dataSourceVersionId?: string;
  rowNumbers?: number[];
}) {
  let dataSourceVersionIds: Types.ObjectId[] = [];

  // -------------------------------
  // CUSTOM REPORT FLOW
  // -------------------------------
  // if (reportRequestId) {
  //   const reportRequest: any = await findReportRequestById(reportRequestId);
  //   const customReport: any = await findCustomReportById(
  //     reportRequest?.customReportId
  //   );

  //   if (!customReport?.dataSourceIds?.length) {
  //     return new Map();
  //   }

  //   for (const ds of customReport.dataSourceIds) {
  //     const version: any = await getDataSourceVersion({
  //       query: {
  //         dataSourceId: ds.dataSourceId,
  //         versionValue: reportRequest?.versionValue,
  //         status: { $in : ["failed", "partially-completed"] },
  //         isActive: true,
  //         reportRequestId
  //       },
  //       sort: { createdAt: -1 },
  //     });

  //     if (version) {
  //       dataSourceVersionIds.push(version._id);
  //     }
  //   }
  // }

  // -------------------------------
  // DIRECT DATASOURCE FLOW
  // -------------------------------
  if (!reportRequestId && dataSourceVersionId) {
    dataSourceVersionIds = [new Types.ObjectId(dataSourceVersionId)];
  }

  if (!dataSourceVersionIds.length) {
    return new Map();
  }

  // -------------------------------
  // ERROR QUERY
  // -------------------------------
  const query: any = {
    dataSourceVersionId: { $in: dataSourceVersionIds },
  };

  if (rowNumbers?.length) {
    query._id = { $in: rowNumbers };
  }

  const records =
    await dataImportErrorServices.getDataImportErrorRecords(query);

  // -------------------------------
  // GROUPING
  // -------------------------------
  const map = new Map<
    string,
    {
      dataSourceId: Types.ObjectId;
      dataSourceVersionId: Types.ObjectId;
      rowNumbers: number[];
    }
  >();

  // 1️ Pre-fill map (safe)
  for (const dsvId of dataSourceVersionIds) {
    const version: any = await getDataSourceVersion({
      query: { _id: dsvId },
    });

    if (!version) continue;

    const key = `${version.dataSourceId}_${version._id}`;

    if (!map.has(key)) {
      map.set(key, {
        dataSourceId: version.dataSourceId,
        dataSourceVersionId: version._id,
        rowNumbers: [],
      });
    }
  }

  // 2️ Just push row numbers (no need to check map existence)
  for (const r of records) {
    const key = `${r.dataSourceId}_${r.dataSourceVersionId}`;
    // if (!map.has(key)) {
    //   map.set(key, {
    //     dataSourceId: r.dataSourceId,
    //     dataSourceVersionId: r.dataSourceVersionId,
    //     rowNumbers: [],
    //   });
    // }
    map.get(key)!.rowNumbers.push(r.rowNumber);
  }

  return map;
}

export const resolveDataImportError = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      action,
      rowNumber,
      reportRequestId,
      dataSourceVersionId,
      attributeOptionId,
      fileAttributeValue,
      attributeName,
    } = req.body;

    let { rowData } = req.body;
    const { orgCode, userId, organizationId } = req.user;

    const rowNumbers = Array.isArray(rowNumber) ? rowNumber : [rowNumber];

    if (!reportRequestId && !dataSourceVersionId) {
      return res.status(400).json({
        success: false,
        message: "Either reportRequestId or dataSourceVersionId is required",
      });
    }

    const groupedContexts = await getGroupedErrorContext({
      reportRequestId,
      dataSourceVersionId,
      rowNumbers: rowNumber ? rowNumbers : undefined,
    });

    const contextsToProcess =
                    action === "discardAllSubmit" || action === "submit"
                      ? groupedContexts
                      : new Map(
                          [...groupedContexts].filter(
                            ([, ctx]) => ctx.rowNumbers.length > 0
                          )
                        );


    if (!contextsToProcess.size) {
      return res.status(400).json({
        success: false,
        message: "No error records found",
      });
    }

    // --------------------------------------------------
    // PRELOAD DATASOURCE CACHE (ONE DB HIT PER DATASOURCE)
    // --------------------------------------------------
    const dataSourceCache = new Map<string, any>();

    await Promise.all(
      [...contextsToProcess.values()].map(async (ctx) => {
        if (!dataSourceCache.has(ctx.dataSourceId)) {
          const ds = await dataSourceService.findDataSourceById(
            ctx.dataSourceId,
            true
          );
          dataSourceCache.set(ctx.dataSourceId, ds);
        }
      })
    );

    // helper
    const getCachedDataSource = (id: string) => dataSourceCache.get(id);

    // =====================================================
    // DISCARD
    // =====================================================
    if (action === "discard") {
      for (const [, ctx] of contextsToProcess) {
        const dataSource = getCachedDataSource(ctx.dataSourceId);

        const errorSchema =
          getImportLogSchemaNameBasedOnVersionCodeAndOrgCode({
            orgCode,
            versionCode: dataSource?.code!,
          });

        const openRecords =
          await dataImportErrorServices.getDataImportErrorRecords({
            dataSourceVersionId: ctx.dataSourceVersionId,
            rowNumber: { $in: ctx.rowNumbers },
            status: "open",
          });

        const openRows = new Set(openRecords.map((r) => r.rowNumber));
        const invalid = ctx.rowNumbers.filter((r) => !openRows.has(r));

        if (invalid.length) {
          const allErrors =
            await dataImportErrorServices.getDataImportErrorRecords({
              dataSourceVersionId: ctx.dataSourceVersionId,
              rowNumber: { $in: invalid },
            });

          const fileRows = [
            ...new Set(allErrors.map((r) => r.fileRowNumber)),
          ];

          return res.status(400).json({
            success: false,
            message: `These row numbers can not be discarded: ${fileRows.join(
              ", "
            )}`,
          });
        }

        await Promise.all([
          dataImportErrorServices.updateDataImportErrors(
            {
              dataSourceVersionId: ctx.dataSourceVersionId,
              rowNumber: { $in: ctx.rowNumbers },
            },
            { status: "discarded" }
          ),
          importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
            errorSchema,
            {
              dataSourceVersionId: ctx.dataSourceVersionId,
              rowNumber: { $in: ctx.rowNumbers },
            },
            { isErrorLog: 1000 }
          ),
        ]);
      }
    }

    // =====================================================
    // DISCARD ALL & SUBMIT
    // =====================================================
    else if (action === "discardAllSubmit") {
      for (const [, ctx] of contextsToProcess) {
        const dataSource = getCachedDataSource(ctx.dataSourceId);

        const errorSchema =
          getImportLogSchemaNameBasedOnVersionCodeAndOrgCode({
            orgCode,
            versionCode: dataSource?.code!,
          });

        const mainSchema =
          getSchemaNameBasedOnVersionCodeAndOrgCode({
            orgCode,
            versionCode: dataSource?.code!,
          });

        await dataImportErrorServices.updateDataImportErrors(
          {
            dataSourceVersionId: ctx.dataSourceVersionId,
            status: "open",
          },
          { status: "discarded" }
        );

        const validRows =
          await importLogDataSourceVersionValueService.getImportLogDataSourceVersionValues(
            errorSchema,
            {
              dataSourceVersionId: ctx.dataSourceVersionId,
              isErrorLog: 0,
            }
          );

        if (validRows.length) {
          await dataSourceVersionValueService.createDataSourceVersionValue(
            mainSchema,
            validRows
          );
        }

        await importLogDataSourceVersionValueService.deleteImportLogDataSourceVersionValues(
          errorSchema,
          {
            dataSourceVersionId: ctx.dataSourceVersionId,
            isErrorLog: 0,
          }
        );

        await updateCustomDataSourceVersionIsCurrentFunction({
          dataSourceVersionId: ctx.dataSourceVersionId,
          user: req.user
        });
      }

      // GENERATE CUSTOM REPORT (ONLY IF reportRequestId)
      // if (reportRequestId) {
      //   const reportRequest: any = await findReportRequestById(reportRequestId);
      //   await updateReportRequest(reportRequestId, {
      //     status: 'processing'
      //   });
      //     generateCustomReportsFunction({
      //       versionValue: reportRequest?.versionValue,
      //       userId,
      //       organizationId,
      //       orgCode,
      //       customReportId: reportRequest?.customReportId,
      //       reportRequestId,
      //     }).then(() => {
      //     console.log(
      //       `[${new Date().toISOString()}] generateCustomReportsFunction completed`
      //     );
      //   })
      //   .catch((err) => {
      //     console.error(
      //       `[${new Date().toISOString()}] generateCustomReportsFunction failed`,
      //       err
      //     );
      //   });
      // }
    }

    // =====================================================
    // UPDATE
    // =====================================================
    else if (action === "update") {
      for (const [, ctx] of contextsToProcess) {
        const dataSource = getCachedDataSource(ctx.dataSourceId);

        const entity = dataSource?.entityId as any;

        const errorSchema =
          getImportLogSchemaNameBasedOnVersionCodeAndOrgCode({
            orgCode,
            versionCode: dataSource?.code!,
          });

        rowData = Object.fromEntries(
          Object.entries(rowData || {}).filter(
            ([key]) => key === attributeName
          )
        );

        await autoPopulateAttributeOptionFromRow({
          entityId: entity._id,
          attributes: entity.attributes,
          rowData,
          userId,
          organizationId,
        });

        const { isValid, errors, validatedRowData } = await validateRowData({
          rowData,
          attributes: entity.attributes,
        });

        if (!isValid) {
          return res.status(400).json({ success: false, errors });
        }

        const updateFields: any = {};
        Object.entries(validatedRowData).forEach(
          ([k, v]) => (updateFields[`rowData.${k}`] = v)
        );

        await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
          errorSchema,
          {
            dataSourceVersionId: ctx.dataSourceVersionId,
            rowNumber: { $in: ctx.rowNumbers },
          },
          updateFields,
          { isErrorLog: -1 }
        );

        const version = await getDataSourceVersion({
          query: { _id: ctx.dataSourceVersionId },
        });

        await handleReferenceSubFields({
          rowData: validatedRowData,
          attributes: entity.attributes,
          dataSourceId: ctx.dataSourceId,
          versionId: version?._id,
          versionValue: version?.versionValue,
          userId,
          organizationId,
        });

        await dataImportErrorServices.updateDataImportErrors(
          {
            dataSourceVersionId: ctx.dataSourceVersionId,
            rowNumber: { $in: ctx.rowNumbers },
            attributeName,
            fileAttributeValue,
          },
          { status: "resolved" }
        );
      }

    }

    // =====================================================
    // ADD OPTION
    // =====================================================
    else if (action === "addOption") {
      await attributeOptionService.addAttributeValueById(
        attributeOptionId,
        fileAttributeValue
      );

      for (const [, ctx] of contextsToProcess) {
        const dataSource = getCachedDataSource(ctx.dataSourceId);

        const errorSchema =
          getImportLogSchemaNameBasedOnVersionCodeAndOrgCode({
            orgCode,
            versionCode: dataSource?.code!,
          });

        const records =
          await dataImportErrorServices.getDataImportErrorRecords({
            dataSourceVersionId: ctx.dataSourceVersionId,
            attributeOptionId,
            fileAttributeValue,
            status: "open",
          });

        const rows = records.map((r) => r.rowNumber);

        await dataImportErrorServices.updateDataImportErrors(
          {
            dataSourceVersionId: ctx.dataSourceVersionId,
            rowNumber: { $in: rows },
          },
          { status: "resolved" }
        );

        await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
          errorSchema,
          {
            dataSourceVersionId: ctx.dataSourceVersionId,
            rowNumber: { $in: rows },
          },
          {},
          { isErrorLog: -1 }
        );
      }

    }

    // =====================================================
    // SUBMIT
    // =====================================================
    else if (action === "submit") {
      for (const [, ctx] of contextsToProcess) {
        const open =
          await dataImportErrorServices.getDataImportErrorRecords({
            dataSourceVersionId: ctx.dataSourceVersionId,
            status: "open",
          });

        if (open.length) {
          return res.status(400).json({
            message: "Some of the record has not been resolved.",
          });
        }

        const dataSource = getCachedDataSource(ctx.dataSourceId);

        const errorSchema =
          getImportLogSchemaNameBasedOnVersionCodeAndOrgCode({
            orgCode,
            versionCode: dataSource?.code!,
          });

        const mainSchema =
          getSchemaNameBasedOnVersionCodeAndOrgCode({
            orgCode,
            versionCode: dataSource?.code!,
          });

        const validRows =
          await importLogDataSourceVersionValueService.getImportLogDataSourceVersionValues(
            errorSchema,
            {
              dataSourceVersionId: ctx.dataSourceVersionId,
              isErrorLog: 0,
            }
          );

        await dataSourceVersionValueService.createDataSourceVersionValue(
          mainSchema,
          validRows
        );

        await importLogDataSourceVersionValueService.deleteImportLogDataSourceVersionValues(
          errorSchema,
          {
            dataSourceVersionId: ctx.dataSourceVersionId,
            isErrorLog: 0,
          }
        );

        await updateCustomDataSourceVersionIsCurrentFunction({
          dataSourceVersionId: ctx.dataSourceVersionId,
          user: req.user
        });
      }

      // GENERATE CUSTOM REPORT (ONLY IF reportRequestId)
      // if (reportRequestId) {
      //   const reportRequest: any = await findReportRequestById(reportRequestId);
      //   await updateReportRequest(reportRequestId, {
      //     status: 'processing'
      //   });
      //   generateCustomReportsFunction({
      //     versionValue: reportRequest?.versionValue,
      //     userId,
      //     organizationId,
      //     orgCode,
      //     customReportId: reportRequest?.customReportId,
      //     reportRequestId,
      //   }).then(() => {
      //     console.log(
      //       `[${new Date().toISOString()}] generateCustomReportsFunction completed`
      //     );
      //   })
      //   .catch((err) => {
      //     console.error(
      //       `[${new Date().toISOString()}] generateCustomReportsFunction failed`,
      //       err
      //     );
      //   });
      // }

    }

    // =====================================================
    // UNIQUE
    // =====================================================
    else if (action === "unique") {
      for (const [, ctx] of contextsToProcess) {
        const dataSource = getCachedDataSource(ctx.dataSourceId);

        const errorSchema =
          getImportLogSchemaNameBasedOnVersionCodeAndOrgCode({
            orgCode,
            versionCode: dataSource?.code!,
          });

        await dataImportErrorServices.updateDataImportErrors(
          {
            dataSourceVersionId: ctx.dataSourceVersionId,
            rowNumber: { $in: ctx.rowNumbers },
          },
          { status: "resolved" }
        );

        await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
        errorSchema,
        { dataSourceVersionId: new ObjectId(ctx.dataSourceVersionId), rowNumber: { $in: ctx.rowNumbers } },
        {},
        {
          isErrorLog: -1,
        }
      );

        const dublicateRecords = await dataImportErrorServices.getDataImportErrorRecords({
        dataSourceVersionId: ctx.dataSourceVersionId,
        fileAttributeValue: fileAttributeValue,
        errorCode: '1005',
        status: 'open',
      });

      const rowNumbersToUpdate = dublicateRecords.map((record) => record.rowNumber);

      await dataImportErrorServices.updateDataImportErrors(
        {
          dataSourceVersionId: ctx.dataSourceVersionId,
          rowNumber: { $in: rowNumbersToUpdate },
        },
        { status: 'discarded' }
      );
      await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
        errorSchema,
        {
          dataSourceVersionId: new ObjectId(ctx.dataSourceVersionId),
          rowNumber: { $in: rowNumbersToUpdate },
        },
        {
          isErrorLog: 1000,
        }
      );
      }

    }else{

      return res.status(400).json({
        success: false,
        message: "Invalid action",
      });
    }
    return res.status(200).json({ success: true, message: 'Action Applied.' });
  } catch (err) {
    next(err);
  }
};


export const getErrorRowDataBasedOnDataSourceVersionIdAndRowNumber = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { dataSourceId, dataSourceVersionId, rowNumber, errorId } = req.query as any;
    const { orgCode } = req.user;
    const dataSourceDetails = await dataSourceService.findDataSourceById(dataSourceId, true);
    const schemaName = getImportLogSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: dataSourceDetails?.code!,
    });
    const rawData = await importLogDataSourceVersionValueService.getImportLogDataSourceVersionValuesV1(schemaName, {
      dataSourceVersionId: new ObjectId(dataSourceVersionId),
      rowNumber: Number(rowNumber),
    },
    dataSourceDetails?.entityId
  );

  let errorAction: string = '';

  if (errorId) {
    const errorRecord = await dataImportErrorServices.getDataImportErrorRecord({ _id: new ObjectId(errorId) });

    if (errorRecord) {
      const { errorCode, attributeName } = errorRecord;

      if (["1001", "1002", "1004"].includes(errorCode)) {
        errorAction = `Fix Error - ${attributeName}`;
      } else if (errorCode === "1003") {
        errorAction = `Create New ${attributeName}`;
      }
    }
  }

    res.status(200).json({
      success: true,
      message: 'Data retrieved successfully.',
      data: {
        ...rawData[0] ?? rawData,
        errorAction
      }
    });
  } catch (err) {
    console.log('Error in getDataBasedOnDataSourceVersionIdAndRowNumber', err);
    next(err);
  }
};
