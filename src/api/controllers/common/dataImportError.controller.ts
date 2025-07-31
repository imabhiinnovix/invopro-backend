import { Request, Response, NextFunction } from 'express';
import * as dataImportErrorServices from '../../../database/services/common/dataImportError.services';
import { getImportLogSchemaNameBasedOnVersionCodeAndOrgCode } from '../../../utils/common.utils';
import * as dataSourceService from '../../../database/services/common/dataSource.services';
import * as importLogDataSourceVersionValueService from '../../../database/services/common/defaultImportLogDataSourceVersionValue.services';
import { Schema } from 'mongoose';
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

export const discardDataImportError = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action, rowNumber, dataSourceVersionId, dataSourceId } = req.body;
    const { orgCode } = req.user;
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
          dataSourceVersionId: new Schema.Types.ObjectId(dataSourceVersionId),
          rowNumber: rowNumber,
        },
        {
          isErrorLog: 1000,
        }
      );
    } else if (action === 'discardAll') {
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
          dataSourceVersionId: new Schema.Types.ObjectId(dataSourceVersionId),
          isErrorLog: 1,
        },
        {
          isErrorLog: 1000,
        }
      );
    } else {
      return res.status(400).json({ message: 'Not valid action.' });
    }
  } catch (err) {
    next(err);
  }
};
