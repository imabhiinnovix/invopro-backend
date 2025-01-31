import { Request, Response, NextFunction } from 'express';
import { promises as fsPromises } from 'fs';
import * as dataSourceVersionService from '../../database/services/dataSourceVersion.services';
import * as dataSourceVersionValueService from '../../database/services/defaultDataSourceVersionValue.services';
import * as dataSourceService from '../../database/services/dataSource.services';
import * as attributeOptionService from '../../database/services/attributeOption.services';
import * as dataImportErrorServices from '../../database/services/dataImportError.services';
import { getSchemaNameBasedOnVersionCodeAndOrgCode } from '../../utils/common.utils';
import path from 'path';
import { excelDateToJSDate, readExcelFile } from '../../utils/excel.utils';
import { debounceManager } from '../../utils/debounce.utils';
async function validateAndConvert({
  value,
  type,
  optionAttributeId,
  separator,
}: {
  value: any;
  type: string;
  optionAttributeId?: string;
  separator?: string;
}) {
  if (type === 'number') {
    const convertedValue = parseFloat(value);
    return { isValid: !isNaN(convertedValue), convertedValue: !isNaN(convertedValue) ? convertedValue : null };
  } else if (type === 'text' || type === 'richtext') {
    const convertedValue = value !== undefined && value !== null ? String(value) : null;
    return { isValid: typeof convertedValue === 'string', convertedValue };
  } else if (type === 'date') {
    if (typeof value === 'number') {
      value = excelDateToJSDate(value);
    }
    const convertedValue = new Date(value);
    return {
      isValid: !isNaN(convertedValue.getTime()),
      convertedValue: !isNaN(convertedValue.getTime()) ? convertedValue.toISOString() : null,
    };
  } else if (type === 'boolean') {
    const convertedValue =
      value === 'true' || value === true ? true : value === 'false' || value === false ? false : null;
    return { isValid: typeof convertedValue === 'boolean', convertedValue };
  } else if (type === 'url') {
    const urlRegex =
      /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/;
    const isValid = urlRegex.test(value);
    return { isValid, convertedValue: isValid ? value : null };
  } else if (type === 'email') {
    const emailRegex =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const isValid = emailRegex.test(value);
    return { isValid, convertedValue: isValid ? value : null };
  } else if (type === 'option' || type === 'multioption') {
    if (optionAttributeId) {
      const attributeOptionDetails = await attributeOptionService.findAttributeOptionById(optionAttributeId);
      const attributeOptionValue = attributeOptionDetails?.attributeValue ? attributeOptionDetails?.attributeValue : [];
      if (type === 'option') {
        const isValid = attributeOptionValue.includes(value);
        return { isValid, convertedValue: isValid ? value : null, attributeOptionValue: attributeOptionValue };
      } else {
        const splittedValue = value.split(separator);
        const allValid = splittedValue.every((val: any) => attributeOptionValue.includes(val));
        return {
          isValid: allValid,
          convertedValue: allValid ? splittedValue : null,
          attributeOptionValue: attributeOptionValue,
        };
      }
    } else {
      return {
        isValid: false,
        convertedValue: null,
      };
    }
  }
  return { isValid: true, convertedValue: value };
}
async function validateFileData({
  fileData,
  attributes,
  mapping,
  separator,
  dataSourceId,
  entityId,
  dataSourceVersionId,
}: {
  fileData: any[];
  attributes: any[];
  mapping: Record<string, string>;
  separator: Record<string, string>;
  dataSourceId: string;
  entityId: any;
  dataSourceVersionId: string;
}) {
  const errors: any[] = [];

  // Map the key of setting attribute with the value attribute
  const reversedMapping = Object.entries(mapping).reduce((acc, [key, value]) => {
    acc[value] = acc[value] ? [...acc[value], key] : [key];
    return acc;
  }, {});

  const newRowData: any[] = [];

  for (const [index, row] of fileData.entries()) {
    const newRow = { dataSourceId, entityId, dataSourceVersionId, rowData: {} };

    for (const attr of attributes) {
      const attrName = attr.name;
      const fileKeyArray = reversedMapping[attrName];
      if (fileKeyArray?.length === 1) {
        const fileKey = fileKeyArray[0];
        const value = row[fileKey];

        // Required field validation
        if (attr.required === 'Mandatory' && (value === undefined || value === null || value === '')) {
          errors.push({
            entityId: entityId,
            dataSourceId: dataSourceId,
            dataSourceVersionId: dataSourceVersionId,
            rowNumber: index + 1,
            fileAttributeName: fileKey,
            attributeName: attrName,
            errorType: 'Not Found',
            errorCode: '404',
            errorMessage: `Error: Row ${index + 1} - The attribute "${attrName}" is required but is missing.`,
          });
        } else if (value !== undefined) {
          const { isValid, convertedValue, attributeOptionValue } = await validateAndConvert({
            value,
            type: attr.type,
            optionAttributeId: attr.optionAttributeId,
            separator: separator[value],
          });

          if (!isValid) {
            if (['option', 'multioption'].includes(attr.type)) {
              errors.push({
                entityId: entityId,
                dataSourceId: dataSourceId,
                dataSourceVersionId: dataSourceVersionId,
                rowNumber: index + 1,
                fileAttributeName: fileKey,
                fileAttributeValue: value,
                attributeName: attrName,
                errorType: 'Type Error',
                errorCode: '400',
                errorMessage: `Error: Row ${index + 1} - ${fileKey} has a value ${value}, but a value of type ${attr.type} was expected from one of the valid settings attribute(${attrName}) options ${attributeOptionValue}.`,
              });
            } else {
              errors.push({
                entityId: entityId,
                dataSourceId: dataSourceId,
                dataSourceVersionId: dataSourceVersionId,
                rowNumber: index + 1,
                fileAttributeName: fileKey,
                fileAttributeValue: value,
                attributeName: attrName,
                errorType: 'Type Error',
                errorCode: '400',
                errorMessage: `Error: Row ${index + 1} - ${fileKey}, has a value ${value} of type ${typeof value}, but a value of type ${attr.type} was expected for the settings attribute ${attrName}.`,
              });
            }
          } else {
            newRow.rowData[attrName] = convertedValue;
          }
        }
      } else {
        errors.push(`Row Number ${index + 1}:${fileKeyArray?.join(',')} has duplicate mapping with ${attrName}.`);
      }
    }

    newRowData.push(newRow);
  }

  return {
    errors,
    newRowData,
  };
}

export async function createDataSourceVersion(req: Request, res: Response, next: NextFunction) {
  try {
    const { versionName, mappings, separator, dataSourceId, versionValue } = req.body;
    const jsonMapping = JSON.parse(mappings);
    const jsonSeparator = JSON.parse(separator);

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
            status: 'processing',
            separator: jsonSeparator,
            fileName: fileName,
            filePath: newFilePath,
            fileType: mimetype,
            fileSize: size,
            mappings: jsonMapping,
            isActive: true,
            isCurrent: false,
          });

          debounceManager.debounce(dataSourceVersion._id as string, async () => {
            try {
              const fileData = await readExcelFile(newFilePath);
              const entityDetails = dataSourceDetails.entityId as any;
              const attributes = entityDetails?.attributes || [];
              const validatedData = await validateFileData({
                fileData,
                attributes,
                mapping: jsonMapping,
                separator: jsonSeparator,
                dataSourceId: dataSourceId,
                dataSourceVersionId: dataSourceVersion._id as string,
                entityId: dataSourceDetails.entityId._id,
              });

              if (validatedData.errors.length > 0) {
                await dataSourceVersionService.updateDataSourceVersion(dataSourceVersion._id as string, {
                  status: 'failed',
                });

                await dataImportErrorServices.createManyDataImportError(validatedData.errors);
              } else {
                const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
                  orgCode,
                  versionCode: dataSourceDetails.code,
                });
                await dataSourceVersionValueService.createDataSourceVersionValue(schemaName, validatedData.newRowData);
                await dataSourceVersionService.updateDataSourceVersions({
                  query: { dataSourceId, versionValue },
                  updateFields: { isCurrent: false },
                });
                await dataSourceVersionService.updateDataSourceVersion(dataSourceVersion._id as string, {
                  status: 'processed',
                  isCurrent: true,
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

export const listDataSourceVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, paginate = 'false' } = req.query;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const query: any = {};
    if (search) query.name = { $regex: search, $options: 'i' };

    let result: any = {};
    if (paginate) {
      result = await dataSourceVersionService.getDataSourceVersionList({
        query,
        page,
        limit,
        populate: [
          {
            path: 'createdBy',
            select: 'firstName lastName', // Specify the fields to populate
          },
          {
            path: 'updatedBy',
            select: 'firstName lastName', // Specify the fields to populate
          },
          {
            path: 'dataSourceId',
            select: 'name', // Specify the fields to populate
          },
        ],
      });
    } else {
      result = await dataSourceService.getDataSourceList({
        query,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Data Source Version Fetched Successfully',
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (err) {
    next(err);
  }
};
