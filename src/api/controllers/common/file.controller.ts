import { Request, Response, NextFunction } from 'express';
import {
  createDataSourceVersion,
  createMultipleDataSourceVersionBasedOnCustomReportId,
} from './dataSourceVersion.controller';
import { getAttributesFromXlsxOrCsvHeaders } from './getAttributesFromXlsxOrCsvHeaders.controller';
import { createDashboardFont } from './dashboardFont.controller';

export const handleFileUpload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { operation } = req.body;

    // if (!req.files?.length) {
    //   return res.status(400).send('No files uploaded.');
    // }

    if (operation === 'getAttributesFromXlsxOrCsvHeaders') {
      return await getAttributesFromXlsxOrCsvHeaders(req, res, next);
    } else if (operation.toLowerCase() === 'datasourceversion') {
      return await createDataSourceVersion(req, res, next);
    } else if (operation.toLowerCase() === 'customreport') {
      return await createMultipleDataSourceVersionBasedOnCustomReportId(req, res, next);
    } else if (operation.toLowerCase() === 'dashboardFont') {
      return await createDashboardFont(req, res, next);
    } else {
      res.status(400).json({
        success: false,
        message: 'Operation not found.',
      });
    }
  } catch (err: any) {
    console.error(err);
    next(err);
  }
};
