/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { getColumnNamesAndTypes } from '../../utils/excel.utils';

export const handleFileUpload = async (req: Request, res: Response, next: NextFunction) => {
  const { userId, organizationId } = req?.user;
  try {
    if (!req.files?.length) {
      return res.status(400).send('No files uploaded.');
    }

    const { operation, bodyData } = req.body;

    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();

    for (const file of files) {
      const { originalname, path: filePath, size, mimetype } = file;
      const fileName = originalname;
      const fileExtension = fileName.split('.').pop();
      if (operation === 'getAttributesFromXlsxOrCsvHeaders') {
        const newFilePath = path.join('uploads', organizationId, userId, 'temp', fileName);
        await fsPromises.mkdir(path.dirname(newFilePath), { recursive: true });
        await fsPromises.rename(filePath, newFilePath);

        if (fileExtension && ['csv', 'xlsx', 'xls'].includes(fileExtension)) {
          const columnNameAndTypeData = await getColumnNamesAndTypes(newFilePath);
          await fsPromises.unlink(newFilePath);
          return res.status(201).json({
            success: true,
            message: 'Attribute Retrieved Successfully',
            data: columnNameAndTypeData,
          });
        } else {
          await fsPromises.unlink(newFilePath);
          throw new Error('Invalid file format');
        }
      }
    }
  } catch (err: any) {
    console.error(err);
    next(err);
  }
};
