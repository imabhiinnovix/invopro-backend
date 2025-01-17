import { Request, Response, NextFunction } from 'express';
import { promises as fsPromises } from 'fs';
import * as dataSourceService from '../../database/services/dataSourceVersion.services';
import { getSchemaNameBasedOnVersionCodeAndOrgCode } from '../../utils/common.utils';
import path from 'path';
// import { createDataSourceVersionValue } from '../../database/services/defaultDataSourceVersionValue.services';

export async function createDataSourceVersionValue(req: Request, res: Response, next: NextFunction) {
  try {
    const { versionName, entityId, dataSourceId, versionValue, fileType } = req.body;
    const { userId, organizationId, orgCode } = req?.user;

    const files = Array.isArray(req.files) ? req.files : Object.values(req.files!).flat();

    for (const file of files) {
      const { originalname, path: filePath, size, mimetype } = file;
      const fileName = originalname;
      const fileExtension = fileName.split('.').pop();

      const newFilePath = path.join('uploads', organizationId, userId, 'temp', fileName);
      await fsPromises.mkdir(path.dirname(newFilePath), { recursive: true });
      await fsPromises.rename(filePath, newFilePath);
      if (fileExtension && ['xlsx', 'xls'].includes(fileExtension)) {
        const existingVersionData =
          await dataSourceService.getDataSourceVersionBasedOnDataSourceIdAndVersionValueAndVersionName(
            dataSourceId,
            versionValue,
            versionName
          );

        if (existingVersionData) {
          return res.status(400).send('Version name already exists for same data source and version value.');
        }

        // const fileData = await readExcelFile(newFilePath);
        // const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
        //   orgCode,
        //   versionCode: 'Portfolios',
        // });

        // const dataSourceVersion = await dataSourceService.createDataSourceVersion({
        //   entityId,
        //   dataSourceId,
        //   versionName,
        //   versionValue,
        //   createdBy: userId,
        //   isActive: true,
        // });

        // const updatedFileData = fileData.map((item) => {
        //   return {
        //     dataSourceId: dataSourceId,
        //     entityId: entityId,
        //     dataSourceVersionId: dataSourceVersion._id,
        //     rowData: {
        //       ...item,
        //     },
        //   };
        // });

        // await createDataSourceVersionValue(schemaName, updatedFileData);
        await fsPromises.unlink(newFilePath);
        return res.status(201).json({
          success: true,
          message: 'Data added successfully',
          // dataSourceVersionId: dataSourceVersion._id,
        });
      } else {
        await fsPromises.unlink(newFilePath);
        throw new Error('Invalid file format');
      }
    }
  } catch (e) {}
}
