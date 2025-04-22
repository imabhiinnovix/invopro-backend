/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { promises as fsPromises } from 'fs';
import * as dataSourceVersionService from '../../database/services/dataSourceVersion.services';
import * as dataSourceVersionValueService from '../../database/services/defaultDataSourceVersionValue.services';
import * as dataSourceService from '../../database/services/dataSource.services';
import * as attributeOptionService from '../../database/services/attributeOption.services';
import * as dataImportErrorServices from '../../database/services/dataImportError.services';
import { getSchemaNameBasedOnVersionCodeAndOrgCode, sleep } from '../../utils/common.utils';
import path from 'path';
import { excelDateToJSDate, readExcelFile } from '../../utils/excel.utils';
import { debounceManager } from '../../utils/debounce.utils';
import * as customReportServices from '../../database/services/customReport.services';
import { generateCustomReportsFunction } from './customReport.controller';
import * as reportRequestService from '../../database/services/reportRequest.services';
import { DateTime } from 'luxon';
import mongoose from 'mongoose';
import { version } from 'os';
const ObjectId = mongoose.Types.ObjectId;

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
    let convertedValue = parseFloat(value);
    if (typeof value === 'string' && value.toLowerCase().trim() === 'yes') {
      convertedValue = 1;
    } else if (typeof value === 'string' && value.toLowerCase().trim() === 'no') {
      convertedValue = 0;
    }

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
  try {
    const errors: any[] = [];

    const newRowData: any[] = [];

    for (const [index, row] of fileData.entries()) {
      const newRow = { dataSourceId, entityId, dataSourceVersionId, rowData: {} };

      for (const attr of attributes) {
        const attrName = attr.name;
        // const fileKeyArray = reversedMapping[attrName];
        // if (fileKeyArray?.length === 1) {
        const fileKey = mapping[attrName];
        let value = row[fileKey];
        if (typeof value === 'object' && value != null) {
          value = value.text;
        }
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
        } else if (value !== undefined && value != null && value) {
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
      }

      newRowData.push(newRow);
    }

    return {
      errors,
      newRowData,
    };
  } catch (e) {
    console.log('Error in validateFileData', e);
    throw e;
  }
}

export async function createDataSourceVersion(req: Request, res: Response, next: NextFunction) {
  try {
    const { versionName, mappings, separator, dataSourceId, versionValue } = req.body;
    const jsonMapping = JSON.parse(mappings);
    const jsonSeparator = separator ? JSON.parse(separator) : {};

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
                  status: 'completed',
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

export async function createMultipleDataSourceVersionBasedOnCustomReportId(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    console.log('Inside createMultipleDataSourceVersionBasedOnCustomReportId function.');
    const { mappings, separator, customReportId, versionValue } = req.body;
    const allJsonMapping = JSON.parse(mappings);

    const allJsonSeparator = separator ? JSON.parse(separator) : {};

    const { userId, organizationId, orgCode } = req?.user;

    const files = Array.isArray(req.files) ? req.files : Object.values(req.files!).flat();
    const customReportData = await customReportServices.findCustomReportById(customReportId);
    if (customReportData && customReportData.dataSourceIds) {
      const currentDateTime = DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss');
      const generateReportFileName = `${customReportData.reportName}_${versionValue}_${currentDateTime}.xlsx`;
      const reportRequestPayload = {
        organizationId: organizationId,
        versionValue: versionValue,
        customReportId: customReportData._id,
        status: 'processing',
        fileName: generateReportFileName,
        filePath: path.join('uploads', organizationId, userId, 'generatedReports', `${generateReportFileName}`),
        fileType: 'xlsx',
        createdBy: userId,
      };
      const requestedReport = await reportRequestService.createReportRequest(reportRequestPayload);
      debounceManager.debounce(customReportId as string, async () => {
        const dAllJsonMapping = allJsonMapping;
        const dAllJsonSeparator = allJsonSeparator;
        const dUserId = userId;
        const dOrganizationId = organizationId;
        const dOrgCode = orgCode;
        const dFiles = files;
        const dcustomReportData = customReportData;
        const reportRequestId = requestedReport._id;

        try {
          for (let i = 0; i < dcustomReportData?.dataSourceIds?.length!; i++) {
            const dataSourceInfo = dcustomReportData?.dataSourceIds[i];
            const dataSourceId = dataSourceInfo?.dataSourceId!;

            const fileDetails = dataSourceInfo?.fileDetails!;
            let dataSourceVersion: any = '';
            let entityDetails: any = '';
            let dataSourceDetails: any = '';
            let validationErrors: any[] = [];
            let validatedFinalData: any[] = [];
            if (fileDetails) {
              for (let j = 0; j < fileDetails.length; j++) {
                try {
                  const fileDetailName = fileDetails[j].name;
                  const sheetName = fileDetails[j].sheetName;

                  let mappingName = fileDetailName;
                  if (sheetName && sheetName.length > 0) {
                    mappingName = `${mappingName}__${sheetName}`;
                  }
                  const file = dFiles.find((file) => {
                    return (
                      file.originalname.split('.')[0].replace(/\s+/g, '').toLowerCase() ===
                      fileDetailName.replace(/\s+/g, '').toLowerCase()
                    );
                  });

                  if (file) {
                    const totalFiles = fileDetails.length;
                    const currentFileIndex = j + 1;
                    const progressPercentage = ((j / totalFiles) * 100).toFixed(0);
                    console.log(
                      `Processing file ${fileDetailName} [${currentFileIndex} of ${totalFiles}] (${progressPercentage}% complete)`
                    );

                    const { originalname, path: filePath, size, mimetype } = file;

                    console.log('originalname', originalname);
                    const fileName = originalname;
                    const fileExtension = fileName.split('.').pop();
                    const newFilePath = path.join(
                      'uploads',
                      dOrganizationId,
                      dUserId,
                      'dsvRequest',
                      `${dataSourceId}_${versionValue}_${fileName}`
                    );
                    try {
                      await fsPromises.access(filePath);
                      await fsPromises.mkdir(path.dirname(newFilePath), { recursive: true });
                      await fsPromises.copyFile(filePath, newFilePath);
                    } catch (e) {
                      console.error('File not found.', e);
                    }

                    if (fileExtension && ['xlsx', 'xls'].includes(fileExtension)) {
                      const jsonMapping = dAllJsonMapping[mappingName] || {};
                      const jsonSeparator = dAllJsonSeparator[fileDetailName] || {};
                      if (!dataSourceVersion) {
                        dataSourceDetails = await dataSourceService.findDataSourceById(dataSourceId, true);
                        if (dataSourceDetails && dataSourceDetails.entityId) {
                          dataSourceVersion = await dataSourceVersionService.createDataSourceVersion({
                            entityId: dataSourceDetails.entityId._id,
                            dataSourceId,
                            versionValue,
                            createdBy: dUserId,
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
                          entityDetails = dataSourceDetails.entityId as any;
                        } else {
                          console.error('Data source details not found.');
                        }
                      }

                      const readSheetName = sheetName ? [sheetName] : [];
                      if (fileDetailName === 'KSA Contracts') {
                        const currentYear = versionValue.split('-')[0];
                        const prevYear = (Number(currentYear) - 1).toString();
                        readSheetName.push(currentYear);
                        readSheetName.push(prevYear);
                      }

                      const fileData = await readExcelFile(newFilePath, readSheetName);

                      const attributes = entityDetails?.attributes || [];

                      const validatedData = await validateFileData({
                        fileData,
                        attributes,
                        mapping: jsonMapping,
                        separator: jsonSeparator,
                        dataSourceId: dataSourceId,
                        dataSourceVersionId: dataSourceVersion._id as string,
                        entityId: entityDetails._id,
                      });

                      if (validatedData.errors.length > 0) {
                        validationErrors = [...validationErrors, ...validatedData.errors];
                      }
                      validatedFinalData = [...validatedFinalData, ...validatedData.newRowData];
                    } else {
                      console.error('Invalid file type. Please upload a file in XLSX or XLS format.');
                    }
                    const progressPercentage2 = ((currentFileIndex / totalFiles) * 100).toFixed(0);

                    console.log(
                      `Processed file ${fileDetailName} [${currentFileIndex} of ${totalFiles}] (${progressPercentage2}% complete)`
                    );

                    console.log('Sleeping for 3 seconds...');
                    await sleep(3000);
                  }
                } catch (e) {
                  console.log(`Error while processing the file: ${fileDetails[j].name}`, e);
                }
              }
            }

            if (dataSourceVersion) {
              if (validationErrors.length > 0) {
                await dataSourceVersionService.updateDataSourceVersion(dataSourceVersion._id as string, {
                  status: 'failed',
                });

                await dataImportErrorServices.createManyDataImportError(validationErrors);
              } else {
                const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
                  orgCode: dOrgCode,
                  versionCode: dataSourceDetails.code,
                });
                await dataSourceVersionValueService.createDataSourceVersionValue(schemaName, validatedFinalData);
                await dataSourceVersionService.updateDataSourceVersions({
                  query: { dataSourceId, versionValue },
                  updateFields: { isCurrent: false },
                });
                await dataSourceVersionService.updateDataSourceVersion(dataSourceVersion._id as string, {
                  status: 'completed',
                  isCurrent: true,
                });
              }
            }
          }

          for (const file of dFiles) {
            if (file.path) {
              try {
                await fsPromises.unlink(file.path); // Deletes the file asynchronously
              } catch (error) {
                console.error(`Error deleting file ${file.path}:`, error);
              }
            }
          }
          console.log('Sleeping for 3 seconds before generating custom report...');
          await sleep(3000);
          await generateCustomReportsFunction({
            versionValue,
            userId: dUserId,
            organizationId: dOrganizationId,
            orgCode: dOrgCode,
            customReportId,
            reportRequestId,
          });
        } catch (e) {
          console.error('An error occurred while processing data source versions.', e);
        }
      });
    } else {
      throw 'Custom report details not found.';
    }

    return res.status(200).json({
      success: true,
      message: 'Data upload is in progress.',
    });
  } catch (e) {
    next(e);
  }
}

export const createUpdateCustomDataSourceVersionValueFunction = async ({
  dataSourceId,
  versionValue,
  versionData,
  userId,
  organizationId,
  orgCode,
  customReportId,
  reportRequestId,
}: {
  dataSourceId: string;
  versionValue: string;
  versionData: any;
  userId: string;
  organizationId: string;
  orgCode: string;
  customReportId?: string;
  reportRequestId?: string;
}) => {
  try {
    const dataSourceDetails = await dataSourceService.findDataSourceById(dataSourceId, true);
    if (dataSourceDetails) {
      const dataSourceVersion = await dataSourceVersionService.createDataSourceVersion({
        entityId: dataSourceDetails.entityId._id,
        dataSourceId,
        versionValue,
        createdBy: userId,
        status: 'processing',
        isActive: true,
        isCurrent: false,
        organizationId,
        customReportId,
        reportRequestId,
      });

      const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
        orgCode: orgCode,
        versionCode: dataSourceDetails.code,
      });

      const nowUtc = DateTime.utc();
      const finalData: any[] = [];
      for (let i = 0; i < versionData.length; i++) {
        const newRow = {
          dataSourceId,
          entityId: dataSourceDetails.entityId._id,
          dataSourceVersionId: dataSourceVersion._id,
          rowData: versionData[i],
          createdAt: nowUtc.plus({ seconds: i }),
          updatedAt: nowUtc.plus({ seconds: i }),
        };

        finalData.push(newRow);
      }
      await dataSourceVersionValueService.createDataSourceVersionValue(schemaName, finalData);
      await dataSourceVersionService.updateDataSourceVersions({
        query: { dataSourceId, versionValue },
        updateFields: { isCurrent: false },
      });
      await dataSourceVersionService.updateDataSourceVersion(dataSourceVersion._id as string, {
        status: 'completed',
        isCurrent: true,
      });

      return { dataSourceVersionId: dataSourceVersion._id, versionCode: dataSourceDetails.code };
    } else {
      throw 'Data source not found.';
    }
  } catch (e) {
    console.log('Error in createUpdateCustomDataSourceVersionValueFunction.', e);
    throw e;
  }
};

export const createUpdateCustomDataSourceVersionValue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dataSourceId, versionValue, versionData } = req.body;
    const { userId, organizationId, orgCode } = req?.user;

    if (Array.isArray(versionData)) {
      await createUpdateCustomDataSourceVersionValueFunction({
        dataSourceId,
        versionValue,
        versionData,
        userId,
        organizationId,
        orgCode,
      });
      return res.status(200).json({
        success: true,
        message: 'Data has been successfully updated.',
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid data format.' });
    }
  } catch (e) {
    console.log('Error in createUpdateDataSourceVersionValue', e);
    next(e);
  }
};

export const getDataSourceVersionDataBasedOnDataSourceIdAndVersionValue = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { dataSourceId, versionValue, page, limit } = req.query as {
      dataSourceId: string;
      versionValue: string;
      page: string;
      limit: string;
    };

    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    const { orgCode } = req?.user;
    const dataSourceDetails = await dataSourceService.findDataSourceById(dataSourceId, true);
    if (dataSourceDetails) {
      const dataSourceVersionDetails = await dataSourceVersionService.getDataSourceVersionList({
        query: { dataSourceId: dataSourceId, versionValue: versionValue, isCurrent: true },
      });

      if (dataSourceVersionDetails && dataSourceVersionDetails.data && dataSourceVersionDetails.data.length > 0) {
        const dataSourceVersionDetail = dataSourceVersionDetails.data[0];
        const dataSourceVersionId = dataSourceVersionDetail._id;
        const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
          orgCode: orgCode,
          versionCode: dataSourceDetails.code,
        });

        const query = { dataSourceVersionId: dataSourceVersionId };

        const dataSourceVersionData = await dataSourceVersionValueService.getDataSourceVersionValue({
          schemaName,
          query,
          page: pageNumber,
          limit: limitNumber,
        });
        return res.status(200).json({
          success: true,
          message: 'Version data has been successfully retrieved.',
          data: dataSourceVersionData.data,
          totalCount: dataSourceVersionData.totalCount,
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Version data has been successfully retrieved.',
        data: [],
        totalCount: 0,
      });
    } else {
      return res.status(404).json({ success: false, message: 'Data source not found.' });
    }
  } catch (e) {
    console.log('Error in getDataSourceVersionDataBasedOnDataSourceIdAndVersionValue.', e);
    next(e);
  }
};

export const getLatestDataSourceVersionDetailBasedOnCustomReportIdAndVersionValue = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { customReportId } = req.params;
    const { userId, organizationId, orgCode } = req?.user;

    // const { search, paginate = 'false' } = req.query;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const result = await dataSourceVersionService.getDataSourceVersionGroupedList({
      match: {
        customReportId: new ObjectId(customReportId),
        reportRequestId: { $exists: true, $ne: '' },
        organizationId: new ObjectId(organizationId),
        isCurrent: true,
      },
      groupBy: 'reportRequestId',
      page,
      limit,
      sort: { versionValue: 1 },

      populate: [
        {
          from: 'custom_reports',
          localField: 'customReportId',
          foreignField: '_id',
          as: 'customReportId',
          isSingle: true,
        },
        {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy',
          isSingle: true,
        },
        {
          from: 'report_requests',
          localField: 'reportRequestId',
          foreignField: '_id',
          as: 'reportRequest', // No need for extra nesting here
          isSingle: false, // Assuming dataSourceVersion is an array
        },
      ],

      selectFields: {
        _id: '$reportRequestId', // Keep the reportRequestId as _id
        versionValue: 1,
        'customReportId.reportName': 1,
        'customReportId._id': 1,
        'createdBy.firstName': 1,
        'createdBy.lastName': 1,
        'dataSourceVersion.name': 1,
        'dataSourceVersion.code': 1,
        'dataSourceVersion.versionCode': 1,
        'dataSourceVersion.dataSourceId': 1,
        'dataSourceVersion.dataSourceVersionId': 1,
        createdAt: 1,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'The available version data has been successfully retrieved.',
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (e) {
    console.log('Error in getLatestDataSourceVersionDetailBasedOnCustomReportIdAndVersionValue.', e);
    next(e);
  }
};
