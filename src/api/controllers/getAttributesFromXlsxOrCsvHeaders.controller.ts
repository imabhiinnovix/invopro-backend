import { Request, Response, NextFunction } from 'express';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { getColumnNamesAndTypes } from '../../utils/excel.utils';

export async function getAttributesFromXlsxOrCsvHeaders(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, organizationId } = req?.user;
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files!).flat();

    for (const file of files) {
      const { originalname, path: filePath } = file;
      const fileName = originalname;
      const fileExtension = fileName.split('.').pop();
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
  } catch (e) {
    console.error(e);
    next(e);
  }
}
