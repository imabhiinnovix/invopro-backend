import { Request, Response, NextFunction } from 'express';
import * as dataImportErrorServices from '../../../database/services/common/dataImportError.services';
import {
  getImportLogSchemaNameBasedOnVersionCodeAndOrgCode,
  getSchemaNameBasedOnVersionCodeAndOrgCode,
} from '../../../utils/common.utils';
import * as dataSourceService from '../../../database/services/common/dataSource.services';
import * as importLogDataSourceVersionValueService from '../../../database/services/common/defaultImportLogDataSourceVersionValue.services';
import mongoose from 'mongoose';
import * as attributeOptionService from '../../../database/services/common/attributeOption.services';
import * as dataSourceVersionValueService from '../../../database/services/common/defaultDataSourceVersionValue.services';
import { updateCustomDataSourceVersionIsCurrentFunction } from './dataSourceVersion.controller';
import { getAttributeByName } from '../../../utils/entity.utils';
const ObjectId = mongoose.Types.ObjectId;

export const listDataSourceVersionErrorBasedOnDataSourceVersionId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      paginate = 'false',
      dataSourceVersionId,
      dataSourceId,
      sortBy = 'rowNumber',
      sortOrder = 'asc',
      search,
      searchFields,
    }: any = req.query;

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const { orgCode, userId } = req.user;

    const query: any = { dataSourceVersionId: dataSourceVersionId };

    let searchCondition: any[] = [];
    if (search) {
      const regex = new RegExp(search as string, 'i');

      searchCondition = [
        // rowNumber is number → convert to string for regex
        {
          $expr: {
            $regexMatch: {
              input: { $toString: '$rowNumber' },
              regex: regex,
            },
          },
        },
        { errorCode: { $regex: regex } },
        { fileName: { $regex: regex } },
        { errorMessage: { $regex: regex } },
        { fileAttributeValue: { $regex: regex } },
        { status: { $regex: regex } },
      ];

      // Support dynamic searchFields array
      if (Array.isArray(searchFields) && searchFields.length > 0) {
        searchFields.forEach((field: string) => {
          searchCondition.push({ [field]: { $regex: regex } });
        });
      }

      if (searchCondition.length > 0) {
        query.$or = searchCondition;
      }
    }
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    let result: any = {};
    if (paginate) {
      result = await dataImportErrorServices.getDataSourceVersionErrrorList({
        query,
        page,
        limit,
        sort,
      });
    } else {
      result = await dataImportErrorServices.getDataSourceVersionErrrorList({
        query,
      });
    }
    query.status =  {$ne:'open'};
    const totalActionCount = await dataImportErrorServices.getDataImportErrorRecordsCount(query)
    const dataSourceDetails = await dataSourceService.findDataSourceById(dataSourceId, true);
    const errorSchemaName = getImportLogSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: dataSourceDetails?.code!,
    });
    const totalUploadedRecords = await importLogDataSourceVersionValueService.getDataSourceVersionValueCount(
                                                                    errorSchemaName, 
                                                                    { dataSourceVersionId: new ObjectId(dataSourceVersionId) }
                                                                  );

    res.status(200).json({
      success: true,
      message: 'Data Import Error Fetched Successfully',
      data: result.data,
      pagination: {
        page: page,
        limit,
        totalPage: Math.ceil(result.totalCount / limit),
        totalRecords: result.totalCount,
      },
      totalCount: result.totalCount,
      totalActionCount,
      totalUploadedRecords
    });
  } catch (err) {
    next(err);
  }
};

export const resolveDataImportError = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      action,
      rowNumber,
      dataSourceVersionId,
      dataSourceId,
      rowData,
      attributeOptionId,
      fileAttributeValue,
    } = req.body;
    const { orgCode, userId } = req.user;
    const dataSourceDetails = await dataSourceService.findDataSourceById(dataSourceId, true);
    const errorSchemaName = getImportLogSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: dataSourceDetails?.code!,
    });

    const mainTableSchemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: dataSourceDetails?.code!,
    });
    if (action === 'discard') {
      await dataImportErrorServices.updateDataImportErrors(
        { dataSourceVersionId: dataSourceVersionId, rowNumber: rowNumber },
        { status: 'discarded' }
      );
      await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
        errorSchemaName,
        {
          dataSourceVersionId: new ObjectId(dataSourceVersionId),
          rowNumber: rowNumber,
        },
        {
          isErrorLog: 1000,
        }
      );
    } else if (action === 'discardAllSubmit') {
      await dataImportErrorServices.updateDataImportErrors(
        {
          dataSourceVersionId: dataSourceVersionId,
          status: 'open',
        },
        {
          status: 'discarded',
        }
      );
      await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
        errorSchemaName,
        {
          dataSourceVersionId: new ObjectId(dataSourceVersionId),
          isErrorLog: 1,
        },
        {
          isErrorLog: 1000,
        }
      );
      let allProcessedVersionValue = await importLogDataSourceVersionValueService.getImportLogDataSourceVersionValues(
        errorSchemaName,
        {
          dataSourceVersionId: new ObjectId(dataSourceVersionId),
          isErrorLog: 0,
        }
      );
      // const entityDetails = dataSourceDetails?.entityId as any;
      // const attributes = entityDetails?.attributes || [];
      // const uniqueAttributeRules = dataSourceDetails?.uniqueAttributeRules || [];

      // if (uniqueAttributeRules.length > 0 && allProcessedVersionValue.length > 0) {
      //   // ✅ build quick lookup map from attributeId → attributeName
      //   const attributeIdToNameMap = attributes.reduce(
      //     (acc, attr) => {
      //       acc[attr._id.toString()] = attr.name;
      //       return acc;
      //     },
      //     {} as Record<string, string>
      //   );
      //   const seenKeys = new Set<string>();
      //   const validRows: any[] = [];
      //   const duplicateRowNumbers: number[] = [];

      //   for (const row of allProcessedVersionValue) {
      //     let compositeKey = '';

      //     for (const rule of uniqueAttributeRules) {
      //       const keyValues: string[] = [];
      //       let validRule = true;

      //       for (const attrId of rule) {
      //         const attrName = attributeIdToNameMap[attrId.toString()];
      //         if (!attrName) {
      //           validRule = false;
      //           break;
      //         }

      //         const val = row.rowData?.[attrName];
      //         if (val === undefined || val === null || val === '') {
      //           validRule = false;
      //           break;
      //         }

      //         keyValues.push(String(val).toLowerCase().trim());
      //       }

      //       if (validRule) {
      //         compositeKey = keyValues.join('|');
      //         break;
      //       }
      //     }

      //     if (compositeKey) {
      //       if (seenKeys.has(compositeKey)) {
      //         duplicateRowNumbers.push(row.rowNumber);
      //       } else {
      //         seenKeys.add(compositeKey);
      //         validRows.push(row);
      //       }
      //     } else {
      //       // no valid composite key → just keep row
      //       validRows.push(row);
      //     }
      //   }

      //   // ✅ discard duplicates
      //   if (duplicateRowNumbers.length > 0) {
      //     await dataImportErrorServices.updateDataImportErrors(
      //       {
      //         dataSourceVersionId,
      //         rowNumber: { $in: duplicateRowNumbers },
      //       },
      //       { status: 'discarded' }
      //     );

      //     await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
      //       errorSchemaName,
      //       {
      //         dataSourceVersionId: new ObjectId(dataSourceVersionId),
      //         rowNumber: { $in: duplicateRowNumbers },
      //       },
      //       { isErrorLog: 1000 }
      //     );
      //   }

      //   allProcessedVersionValue = validRows;
      // }

      if (allProcessedVersionValue.length > 0) {
        await dataSourceVersionValueService.createDataSourceVersionValue(mainTableSchemaName, allProcessedVersionValue);
        await importLogDataSourceVersionValueService.deleteImportLogDataSourceVersionValues(errorSchemaName, {
          dataSourceVersionId: new ObjectId(dataSourceVersionId),
          isErrorLog: 0,
        });
      }

      await updateCustomDataSourceVersionIsCurrentFunction({ dataSourceVersionId });
    } else if (action === 'update') {

      const updateFields: any = {};
      const entityDetails = dataSourceDetails?.entityId as any;
      for (const [key, value] of Object.entries(rowData)) {
        const attribute: any = await getAttributeByName(entityDetails, key);
        if(attribute.type == 'date' || attribute.type == 'date-range' && value){
          updateFields[`rowData.${key}`] = new Date(value as string);
        }else{
          updateFields[`rowData.${key}`] = value;
        }
      }
      await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
        errorSchemaName,
        {
          dataSourceVersionId: new ObjectId(dataSourceVersionId),
          rowNumber: rowNumber,
        },
        updateFields, // ✅ only update given keys inside rowData
        {
          isErrorLog: -1,
        }
      );
      await dataImportErrorServices.updateDataImportErrors(
        { dataSourceVersionId: dataSourceVersionId, rowNumber: rowNumber },
        { status: 'resolved' }
      );
    } else if (action === 'addOption') {
      await attributeOptionService.addAttributeValueById(attributeOptionId, fileAttributeValue);

      const optionRecords = await dataImportErrorServices.getDataImportErrorRecords({
        dataSourceVersionId: dataSourceVersionId,
        attributeOptionId,
        fileAttributeValue,
        status: 'open',
      });

      const rowNumbersToUpdate = optionRecords.map((record) => record.rowNumber);

      console.log('rowNumbersToUpdate', rowNumbersToUpdate);
      await dataImportErrorServices.updateDataImportErrors(
        {
          dataSourceVersionId: dataSourceVersionId,
          attributeOptionId,
          fileAttributeValue,
          rowNumber: { $in: rowNumbersToUpdate },
        },
        { status: 'resolved' }
      );

      await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
        errorSchemaName,
        { dataSourceVersionId: new ObjectId(dataSourceVersionId), rowNumber: { $in: rowNumbersToUpdate } },
        {},
        {
          isErrorLog: -1,
        }
      );
    } else if (action === 'submit') {
      const openRecords = await dataImportErrorServices.getDataImportErrorRecords({
        dataSourceVersionId: dataSourceVersionId,
        status: 'open',
      });
      if (openRecords && openRecords.length > 0) {
        return res.status(400).json({ message: 'Some of the record has not been resolved.' });
      }

      const allProcessedVersionValue = await importLogDataSourceVersionValueService.getImportLogDataSourceVersionValues(
        errorSchemaName,
        {
          dataSourceVersionId: new ObjectId(dataSourceVersionId),
          isErrorLog: 0,
        }
      );

      await dataSourceVersionValueService.createDataSourceVersionValue(mainTableSchemaName, allProcessedVersionValue);
      await importLogDataSourceVersionValueService.deleteImportLogDataSourceVersionValues(errorSchemaName, {
        dataSourceVersionId: new ObjectId(dataSourceVersionId),
        isErrorLog: 0,
      });
      await updateCustomDataSourceVersionIsCurrentFunction({ dataSourceVersionId });
    } else if (action === 'unique') {
      await dataImportErrorServices.updateDataImportErrors(
        { dataSourceVersionId: dataSourceVersionId, rowNumber: rowNumber },
        { status: 'resolved' }
      );
      await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
        errorSchemaName,
        { dataSourceVersionId: new ObjectId(dataSourceVersionId), rowNumber: rowNumber },
        {},
        {
          isErrorLog: -1,
        }
      );

      const dublicateRecords = await dataImportErrorServices.getDataImportErrorRecords({
        dataSourceVersionId: dataSourceVersionId,
        fileAttributeValue: fileAttributeValue,
        errorCode: '1005',
        status: 'open',
      });

      const rowNumbersToUpdate = dublicateRecords.map((record) => record.rowNumber);

      await dataImportErrorServices.updateDataImportErrors(
        {
          dataSourceVersionId: dataSourceVersionId,
          rowNumber: { $in: rowNumbersToUpdate },
        },
        { status: 'discarded' }
      );
      await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
        errorSchemaName,
        {
          dataSourceVersionId: new ObjectId(dataSourceVersionId),
          rowNumber: { $in: rowNumbersToUpdate },
        },
        {
          isErrorLog: 1000,
        }
      );
    } else {
      return res.status(400).json({ success: false, message: 'Not valid action.' });
    }
    return res.status(200).json({ success: true, message: 'Action Applied.', data: { dataSourceId } });
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
    const { dataSourceId, dataSourceVersionId, rowNumber } = req.query as any;
    const { orgCode } = req.user;
    const dataSourceDetails = await dataSourceService.findDataSourceById(dataSourceId, true);
    const schemaName = getImportLogSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: dataSourceDetails?.code!,
    });
    const rawData = await importLogDataSourceVersionValueService.getImportLogDataSourceVersionValues(schemaName, {
      dataSourceVersionId: new ObjectId(dataSourceVersionId),
      rowNumber: Number(rowNumber),
    });

    res.status(200).json({
      success: true,
      message: 'Data retrieved sucessfully.',
      data: rawData,
    });
  } catch (err) {
    console.log('Error in getDataBasedOnDataSourceVersionIdAndRowNumber', err);
    next(err);
  }
};
