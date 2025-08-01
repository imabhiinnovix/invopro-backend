import { Request, Response, NextFunction } from 'express';
import * as dataImportErrorServices from '../../../database/services/common/dataImportError.services';
import { getImportLogSchemaNameBasedOnVersionCodeAndOrgCode } from '../../../utils/common.utils';
import * as dataSourceService from '../../../database/services/common/dataSource.services';
import * as importLogDataSourceVersionValueService from '../../../database/services/common/defaultImportLogDataSourceVersionValue.services';
import mongoose from 'mongoose';
import * as attributeOptionService from '../../../database/services/common/attributeOption.services';
import * as dataSourceVersionValueService from '../../../database/services/common/defaultDataSourceVersionValue.services';
const ObjectId = mongoose.Types.ObjectId;

export const listDataSourceVersionErrorBasedOnDataSourceVersionId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { paginate = 'false', dataSourceVersionId } = req.query;

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const query: any = { dataSourceVersionId: dataSourceVersionId, status: 'open' };

    let result: any = {};
    if (paginate) {
      result = await dataImportErrorServices.getDataSourceVersionErrrorList({
        query,
        page,
        limit,
        sort: { rowNumber: 1 },
      });
    } else {
      result = await dataImportErrorServices.getDataSourceVersionErrrorList({
        query,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Data Import Error Fetched Successfully',
      data: result.data,
      totalCount: result.totalCount,
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
      errorDataId,
      rowData,
      attributeOptionId,
      fileAttributeValue,
    } = req.body;
    const { orgCode, userId } = req.user;
    const dataSourceDetails = await dataSourceService.findDataSourceById(dataSourceId, true);
    const schemaName = getImportLogSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: dataSourceDetails?.code!,
    });

    if (action === 'discard') {
      await dataImportErrorServices.updateDataImportErrors(
        { dataSourceVersionId: dataSourceVersionId, rowNumber: rowNumber },
        { status: 'discarded' }
      );
      await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
        schemaName,
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
        schemaName,
        {
          dataSourceVersionId: new ObjectId(dataSourceVersionId),
          isErrorLog: 1,
        },
        {
          isErrorLog: 1000,
        }
      );
      const allProcessedVersionValue = await importLogDataSourceVersionValueService.getImportLogDataSourceVersionValues(
        schemaName,
        {
          dataSourceVersionId: new ObjectId(dataSourceVersionId),
          isErrorLog: 0,
        }
      );

      await dataSourceVersionValueService.createDataSourceVersionValue(schemaName, allProcessedVersionValue);
    } else if (action === 'update') {
      await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
        schemaName,
        { _id: new ObjectId(errorDataId) },
        { rowData: rowData },
        {
          isErrorLog: -1,
        }
      );
      await dataImportErrorServices.updateDataImportErrors(
        { dataSourceVersionId: dataSourceVersionId, rowNumber: rowNumber },
        { status: 'resolved' }
      );
    } else if (action === 'addOption') {
      await attributeOptionService.updateAttribute(attributeOptionId, {
        fileAttributeValue,
        updatedBy: userId,
      });

      const optionRecords = await dataImportErrorServices.getDataImportErrorRecords({
        dataSourceVersionId: dataSourceVersionId,
        attributeOptionId,
        fileAttributeValue,
        status: 'open',
      });

      const rowNumbersToUpdate = optionRecords.map((record) => record.rowNumber);

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
        schemaName,
        { dataSourceVersionId: new ObjectId(errorDataId), rowNumber: { $in: rowNumbersToUpdate } },
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
        schemaName,
        {
          dataSourceVersionId: new ObjectId(dataSourceVersionId),
          isErrorLog: 0,
        }
      );

      await dataSourceVersionValueService.createDataSourceVersionValue(schemaName, allProcessedVersionValue);
    } else if (action === 'unique') {
      await dataImportErrorServices.updateDataImportErrors(
        { dataSourceVersionId: dataSourceVersionId, rowNumber: rowNumber },
        { status: 'resolved' }
      );
      await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
        schemaName,
        { dataSourceVersionId: new ObjectId(dataSourceVersionId), rowNumber: rowNumber },
        {},
        {
          isErrorLog: -1,
        }
      );
      await importLogDataSourceVersionValueService.updateImportLogDataSourceVersionValue(
        schemaName,
        {
          dataSourceVersionId: new ObjectId(dataSourceVersionId),
          errorCode: '1005',
        },
        {
          isErrorLog: 1000,
        }
      );
    } else {
      return res.status(400).json({ message: 'Not valid action.' });
    }
    return res.status(200).json({ message: 'Action Applied.' });
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
