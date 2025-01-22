import { Request, Response, NextFunction } from 'express';
import { promises as fsPromises } from 'fs';
import * as dataSourceVersionService from '../../database/services/dataSourceVersion.services';
import * as dataSourceVersionValueService from '../../database/services/defaultDataSourceVersionValue.services';
import * as dataSourceService from '../../database/services/dataSource.services';
import { getSchemaNameBasedOnVersionCodeAndOrgCode } from '../../utils/common.utils';
import path from 'path';
import { readExcelFile } from '../../utils/excel.utils';
import { debounceManager } from '../../utils/debounce.utils';

function validateType(value: any, type: string): boolean {
  if (type === 'number') {
    return !isNaN(value);
  } else if (type === 'text' || type === 'richtext') {
    return typeof value === 'string';
  } else if (type === 'date') {
    return !isNaN(Date.parse(value));
  } else if (type === 'boolean') {
    return typeof value === 'boolean';
  } else if (type === 'url') {
    const urlRegex = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
    return urlRegex.test(value);
  }
  return true;
}

function validateFileData({
  fileData,
  attributes,
  mapping,
  dataSourceId,
  entityId,
  dataSourceVersionId,
}: {
  fileData: any[];
  attributes: any[];
  mapping: Record<string, string>;
  dataSourceId: string;
  entityId: any;
  dataSourceVersionId: string;
}) {
  const errors: string[] = [];

  //we will map key of setting attribute with the value attribute
  const reversedMapping = Object.entries(mapping).reduce((acc, [key, value]) => {
    acc[value] = acc[value] ? [...acc[value], key] : [key];
    return acc;
  }, {});

  const newRowData: any[] = [];
  fileData.forEach((row, index) => {
    const newRow = { dataSourceId, entityId, dataSourceVersionId, rowData: {} };
    attributes.forEach((attr) => {
      const mappedKeyArray = reversedMapping[attr.name];
      if (mappedKeyArray.length === 1) {
        const mappedKey = mappedKeyArray[0];
        const value = row[mappedKey];
        // Required field validation
        if (attr.required === 'Mandatory' && (value === undefined || value === null || value === '')) {
          errors.push(`Row Number ${index + 1}:${mappedKey} is required but missing in row ${index + 1}`);
        } else if (value !== undefined && !validateType(value, attr.type)) {
          errors.push(
            `Row Number ${index + 1}:${mappedKey} has type ${typeof value}, but expected ${attr.type} in row ${index + 1}.`
          );
        } else {
          newRow.rowData[attr.name] = value;
        }
      } else {
        errors.push(
          `Row Number ${index + 1}:${mappedKeyArray.join(',')} has same dublicate mapping with ${attr.name}.`
        );
      }
    });
    newRowData.push(newRow);
  });

  return {
    errors,
    newRowData,
  };
}
export async function createDataSourceVersion(req: Request, res: Response, next: NextFunction) {
  try {
    const { versionName, mappings, dataSourceId, versionValue } = req.body;
    const jsonMapping = JSON.parse(mappings);

    const { userId, organizationId, orgCode } = req?.user;

    const files = Array.isArray(req.files) ? req.files : Object.values(req.files!).flat();

    for (const file of files) {
      const { originalname, path: filePath, size, mimetype } = file;
      const fileName = originalname;
      const fileExtension = fileName.split('.').pop();

      const newFilePath = path.join(
        'uploads',
        organizationId,
        userId,
        'dsvRequest',
        `${dataSourceId}_${versionValue}_${versionName}_${fileName}`
      );
      await fsPromises.mkdir(path.dirname(newFilePath), { recursive: true });
      await fsPromises.rename(filePath, newFilePath);
      if (fileExtension && ['xlsx', 'xls'].includes(fileExtension)) {
        const existingVersionData =
          await dataSourceVersionService.getDataSourceVersionBasedOnDataSourceIdAndVersionValueAndVersionName(
            dataSourceId,
            versionValue,
            versionName
          );

        if (existingVersionData) {
          return res.status(400).send('Version name already exists for same data source and version value.');
        }

        const dataSourceDetails = await dataSourceService.findDataSourceById(dataSourceId, true);

        if (dataSourceDetails && dataSourceDetails.entityId) {
          const dataSourceVersion = await dataSourceVersionService.createDataSourceVersion({
            entityId: dataSourceDetails.entityId._id,
            dataSourceId,
            versionName,
            versionValue,
            createdBy: userId,
            status: 'Processing',
            fileName: fileName,
            filePath: newFilePath,
            fileType: mimetype,
            fileSize: size,
            mappings: jsonMapping,
            isActive: true,
          });

          debounceManager.debounce(dataSourceVersion._id as string, async () => {
            try {
              const fileData = await readExcelFile(newFilePath);
              const entityDetails = dataSourceDetails.entityId as any;
              const attributes = entityDetails?.attributes || [];
              const validatedData = validateFileData({
                fileData,
                attributes,
                mapping: jsonMapping,
                dataSourceId: dataSourceId,
                dataSourceVersionId: dataSourceVersion._id as string,
                entityId: dataSourceDetails.entityId._id,
              });
              if (validatedData.errors.length > 0) {
                await dataSourceVersionService.updateDataSourceVersion(dataSourceVersion._id as string, {
                  status: 'Failed',
                  errorMessage: validatedData.errors,
                });
              } else {
                const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
                  orgCode,
                  versionCode: dataSourceDetails.code,
                });
                await dataSourceVersionValueService.createDataSourceVersionValue(schemaName, validatedData.newRowData);
                await dataSourceVersionService.updateDataSourceVersion(dataSourceVersion._id as string, {
                  status: 'Success',
                  errorMessage: validatedData.errors,
                });
              }
            } catch (error) {
              console.error('Error while processing data:', error);
            }
          });
        } else {
          throw new Error('Data source not found.');
        }

        return res.status(200).json({
          success: true,
          message: 'Data upload is in progress.',
        });
      } else {
        throw new Error('Invalid file format');
      }
    }
  } catch (e) {
    console.log(e);
    next(e);
  }
}

export const checkDataSourceVersionNameAvailableOrNot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { versionName, dataSourceId, versionValue } = req.params;

    const existingVersionData =
      await dataSourceVersionService.getDataSourceVersionBasedOnDataSourceIdAndVersionValueAndVersionName(
        dataSourceId,
        versionValue,
        versionName
      );
    if (existingVersionData) {
      res.status(200).json({
        success: true,
        available: false,
        message: versionName,
      });
    } else {
      res.status(200).json({
        success: true,
        available: true,
        message: versionName,
        dataSourceId,
        versionValue,
      });
    }
  } catch (err) {
    next(err);
  }
};
