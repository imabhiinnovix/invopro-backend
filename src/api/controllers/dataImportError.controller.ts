import { Request, Response, NextFunction } from 'express';
import * as dataImportErrorServices from '../../database/services/dataImportError.services';

export const listDataSourceVersionErrorBasedOnDataSourceVersionId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { paginate = 'false', dataSourceVersionId } = req.query;
    console.log('dataSourceVersionId', dataSourceVersionId);
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const query: any = { dataSourceVersionId: dataSourceVersionId };

    let result: any = {};
    if (paginate) {
      result = await dataImportErrorServices.getDataSourceVersionErrrorList({
        query,
        page,
        limit,
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
