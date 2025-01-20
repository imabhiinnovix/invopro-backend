import { Request, Response, NextFunction } from 'express';
import { getDataSourceVersionAttributeMapping } from './dataSourceVersion.controller';
import { getAttributesFromXlsxOrCsvHeaders } from './getAttributesFromXlsxOrCsvHeaders.controller';

export const handleFileUpload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { operation } = req.body;

    if (!req.files?.length) {
      return res.status(400).send('No files uploaded.');
    }

    if (operation === 'getAttributesFromXlsxOrCsvHeaders') {
      return await getAttributesFromXlsxOrCsvHeaders(req, res, next);
    }

    if (operation === 'dataSourceVersionAttributeMapping') {
      return await getDataSourceVersionAttributeMapping(req, res, next);
    }
  } catch (err: any) {
    console.error(err);
    next(err);
  }
};
