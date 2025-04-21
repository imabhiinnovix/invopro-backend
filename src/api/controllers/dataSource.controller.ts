/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';

import * as dataSourceService from '../../database/services/dataSource.services';
import * as defaultDataSourceVersionValue from '../../database/services/defaultDataSourceVersionValue.services';
import * as entityService from '../../database/services/entity.services';
import { getSchemaNameBasedOnVersionCodeAndOrgCode } from '../../utils/common.utils';
import { doesOperatorRequireValue, isValidOperatorForFieldType } from '../../utils/fieldOperators';
import createDefaultDataSourceVersionModel from '../../database/models/defaultDataSourceVersionModel';
import * as dataSourceVersionService from '../../database/services/dataSourceVersion.services';
import { DataSourceVersion } from '../../types/widget.types';

import {
  handleNumberOperators,
  handleStringOperators,
  handleDateOperators,
  handleBooleanOperators,
  handleDefaultOperators,
} from '../../utils/fieldOperatorHandlers';

export const createDataSourcce = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityId, name, code, versionType, description } = req.body;
    const { organizationId, userId, orgCode } = req.user;

    const dataSourceData = await dataSourceService.findDataSourceByCodeAndOrganization(code, organizationId);
    if (dataSourceData) {
      return res.status(400).json({ success: false, message: 'Data Source Option Code Already Exists' });
    }

    const collectionName = getSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: code,
    });
    await defaultDataSourceVersionValue.createEmptyCollection(collectionName);
    const dataSource = await dataSourceService.createDataSourcce({
      entityId,
      name,
      code,
      versionType,
      organizationId,
      createdBy: userId,
      isActive: true,
      description,
    });
    res.status(201).json({
      success: true,
      message: 'Data Source Created Successfully',
      data: dataSource,
    });
  } catch (err) {
    next(err);
  }
};

export const updateDataSource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, versionType, description } = req.body;
    const { userId } = req.user;

    await dataSourceService.updateDataSource(req.params.dataSourceId, {
      name,
      versionType,
      updatedBy: userId,
      description,
    });
    res.status(201).json({
      success: true,
      message: 'Data Source updated Successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const checkDataSourceCodeAvailableOrNot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const { organizationId } = req.user;

    const dataSourceData = await dataSourceService.findDataSourceByCodeAndOrganization(code, organizationId);
    if (dataSourceData) {
      res.status(200).json({
        success: true,
        available: false,
        message: code,
      });
    } else {
      res.status(200).json({
        success: true,
        available: true,
        message: code,
      });
    }
  } catch (err) {
    next(err);
  }
};

export const checkDataSourceNameAvailableOrNot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.params;
    const { organizationId } = req.user;

    const dataSourceData = await dataSourceService.findDataSourceByNameAndOrganization(name, organizationId);
    if (dataSourceData) {
      res.status(200).json({
        success: true,
        available: false,
        message: name,
      });
    } else {
      res.status(200).json({
        success: true,
        available: true,
        message: name,
      });
    }
  } catch (err) {
    next(err);
  }
};

export const listDataSource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, paginate = false, canEditInline = false } = req.query;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const { organizationId } = req.user;

    const query: any = { organizationId };
    if (search) query.name = { $regex: search, $options: 'i' };

    if (canEditInline) {
      query['canEditInline'] = true;
    }
    let result: any = {};
    if (paginate) {
      result = await dataSourceService.getDataSourceList({
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
            path: 'entityId',
            select: 'name attributes canEditInline', // Specify the fields to populate
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
      message: 'Data Source Fetched Successfully',
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (err) {
    next(err);
  }
};

export const getDataSourceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dataSourceDetails = await dataSourceService.findDataSourceById(req.params.dataSourceId);
    res.status(200).json({
      success: true,
      message: 'Data Source Details Fetched Successfully',
      data: dataSourceDetails,
    });
  } catch (err) {
    next(err);
  }
};

// // Helper functions to handle operators based on field type
// const handleNumberOperators = (condition: any, convertedValue: any, fieldPath: string, matchConditions: any) => {
//   const fieldName = `rowData.${condition.field}`;

//   switch (condition.operator) {
//     case 'eq':
//       matchConditions[fieldName] = convertedValue;
//       break;
//     case 'lt':
//     case 'lte':
//     case 'gt':
//     case 'gte':
//     case 'ne':
//       matchConditions[fieldName] = { [`$${condition.operator}`]: convertedValue };
//       break;
//     case 'blank':
//       matchConditions[fieldName] = null;
//       break;
//     case 'notblank':
//       matchConditions[fieldName] = { $ne: null };
//       break;
//     default:
//       console.warn(`Unsupported number operator: ${condition.operator}`);
//       break;
//   }
// };

// const handleStringOperators = (condition: any, convertedValue: any, fieldPath: string, matchConditions: any) => {
//   const fieldName = `rowData.${condition.field}`;

//   switch (condition.operator) {
//     case 'eq':
//       matchConditions[fieldName] = convertedValue;
//       break;
//     case 'ne':
//       matchConditions[fieldName] = { $ne: convertedValue };
//       break;
//     case 'contains':
//       matchConditions[fieldName] = { $regex: convertedValue, $options: 'i' };
//       break;
//     case 'notcontains':
//       matchConditions[fieldName] = { $not: { $regex: convertedValue, $options: 'i' } };
//       break;
//     case 'startswith':
//       matchConditions[fieldName] = { $regex: `^${convertedValue}`, $options: 'i' };
//       break;
//     case 'endswith':
//       matchConditions[fieldName] = { $regex: `${convertedValue}$`, $options: 'i' };
//       break;
//     case 'blank':
//       matchConditions[fieldName] = null;
//       break;
//     case 'notblank':
//       matchConditions[fieldName] = { $ne: null };
//       break;
//     default:
//       console.warn(`Unsupported string operator: ${condition.operator}`);
//       break;
//   }
// };

// const handleDateOperators = (condition: any, convertedValue: any, fieldPath: string, matchConditions: any) => {
//   const fieldName = `rowData.${condition.field}`;

//   switch (condition.operator) {
//     case 'before':
//       matchConditions[fieldName] = { $lt: convertedValue };
//       break;
//     case 'after':
//       matchConditions[fieldName] = { $gt: convertedValue };
//       break;
//     case 'on':
//     case 'noton': {
//       const startOfDay = new Date(convertedValue);
//       startOfDay.setUTCHours(0, 0, 0, 0);
//       const endOfDay = new Date(convertedValue);
//       endOfDay.setUTCHours(23, 59, 59, 999);
//       matchConditions[fieldName] =
//         condition.operator === 'on'
//           ? { $gte: startOfDay, $lt: endOfDay }
//           : { $not: { $gte: startOfDay, $lt: endOfDay } };
//       break;
//     }
//     case 'blank':
//       matchConditions[fieldName] = null;
//       break;
//     case 'notblank':
//       matchConditions[fieldName] = { $ne: null };
//       break;
//     default:
//       console.warn(`Unsupported date operator: ${condition.operator}`);
//       break;
//   }
// };

// const handleBooleanOperators = (condition: any, convertedValue: any, fieldPath: string, matchConditions: any) => {
//   const fieldName = `rowData.${condition.field}`;

//   switch (condition.operator) {
//     case 'eq':
//       matchConditions[fieldName] = convertedValue;
//       break;
//     case 'ne':
//       matchConditions[fieldName] = { $ne: convertedValue };
//       break;
//     case 'blank':
//       matchConditions[fieldName] = null;
//       break;
//     case 'notblank':
//       matchConditions[fieldName] = { $ne: null };
//       break;
//     default:
//       console.warn(`Unsupported boolean operator: ${condition.operator}`);
//       break;
//   }
// };

// const handleDefaultOperators = (condition: any, convertedValue: any, fieldPath: string, matchConditions: any) => {
//   const fieldName = `rowData.${condition.field}`;

//   switch (condition.operator) {
//     case 'eq':
//       matchConditions[fieldName] = convertedValue;
//       break;
//     case 'ne':
//       matchConditions[fieldName] = { $ne: convertedValue };
//       break;
//     case 'blank':
//       matchConditions[fieldName] = null;
//       break;
//     case 'notblank':
//       matchConditions[fieldName] = { $ne: null };
//       break;
//     default:
//       console.warn(`Unsupported operator: ${condition.operator}`);
//       break;
//   }
// };

export const getWidgetDataByFilter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dataSourceId, conditions, entityId, dimensions, groupBy, page = 1, limit = 10 } = req.body;
    const { orgCode } = req.user;

    // 1. Fetch entity and data source information
    const entity: any = await entityService.getEntity({
      _id: entityId,
    });

    if (!entity) {
      throw new Error('Entity not found');
    }

    const dataSource: any = await dataSourceService.getDataSource({
      _id: dataSourceId,
    });

    // 2. Fetch current active data source version
    const dataSourceVersion: any = (await dataSourceVersionService.getDataSourceVersion({
      query: {
        dataSourceId: dataSourceId,
        isCurrent: true,
        isActive: true,
      },
      sort: { versionValue: -1 },
    })) as DataSourceVersion;

    if (!dataSourceVersion) {
      throw new Error('No active data source version found');
    }

    // 3. Build aggregation pipeline for detailed data
    const matchConditions: any = {
      dataSourceId: new Types.ObjectId(dataSourceId),
      dataSourceVersionId: new Types.ObjectId(dataSourceVersion._id),
    };

    // Add dimension conditions to match
    if (dimensions && Array.isArray(dimensions)) {
      dimensions.forEach((dimension) => {
        const [field, value] = Object.entries(dimension)[0];
        matchConditions[`rowData.${field}`] = value;
      });
    }

    // Add groupBy conditions to match
    if (groupBy && Array.isArray(groupBy)) {
      groupBy.forEach((group) => {
        const [field, value] = Object.entries(group)[0];
        matchConditions[`rowData.${field}`] = value;
      });
    }

    // Group conditions by field
    const dateConversions = {};
    const conditionsByField: Record<string, any[]> = {};
    conditions?.forEach((condition) => {
      if (!conditionsByField[condition.field]) {
        conditionsByField[condition.field] = [];
      }
      conditionsByField[condition.field].push(condition);
    });

    // Helper function to get field type from entity
    const getFieldType = (fieldName: string) => {
      const attribute = entity.attributes.find((attr: any) => attr.name === fieldName);
      return attribute ? attribute.type : 'string';
    };

    const getFieldPath = (fieldName: string) => {
      return `$${fieldName}`;
    };

    // Process each field's conditions
    Object.entries(conditionsByField).forEach(([field, conditions]) => {
      const fieldType = getFieldType(field);
      const fieldPath = getFieldPath(`rowData.${field}`);
      const fieldName = `rowData.${field}`;

      // If there's only one condition for this field, process it normally
      if (conditions.length === 1) {
        const condition = conditions[0];

        // Validate if the operator is valid for the field type
        if (!isValidOperatorForFieldType(fieldType, condition.operator)) {
          console.warn(`Operator ${condition.operator} is not valid for field type ${fieldType}`);
          return;
        }

        // Check if the operator requires a value and if it's provided
        if (doesOperatorRequireValue(fieldType, condition.operator) && condition.value === undefined) {
          console.warn(`Operator ${condition.operator} requires a value but none was provided`);
          return;
        }

        if (condition.operator === 'between' && condition.value?.startDate && condition.value?.endDate) {
          const convertedField = `converted_${condition.field}`;

          // Handle date conversion based on field type
          if (fieldType === 'date') {
            dateConversions[convertedField] = {
              $cond: {
                if: { $eq: [{ $type: fieldPath }, 'date'] },
                then: fieldPath,
                else: {
                  $dateFromString: {
                    dateString: fieldPath,
                    format: '%Y-%m-%dT%H:%M:%S.%LZ', // ISO format
                  },
                },
              },
            };
          } else {
            dateConversions[convertedField] = {
              $dateFromString: {
                dateString: fieldPath,
                format: '%Y-%m-%dT%H:%M:%S.%LZ', // ISO format
              },
            };
          }

          matchConditions[convertedField] = {
            $gt: new Date(condition.value.startDate),
            $lt: new Date(condition.value.endDate),
          };
        } else if (fieldType === 'date' && ['on', 'noton', 'before', 'after'].includes(condition.operator)) {
          // Add date conversion for date fields with date-specific operators
          const convertedField = `converted_${condition.field}`;
          dateConversions[convertedField] = {
            $cond: {
              if: { $eq: [{ $type: fieldPath }, 'date'] },
              then: fieldPath,
              else: {
                $dateFromString: {
                  dateString: fieldPath,
                  format: '%Y-%m-%dT%H:%M:%S.%LZ', // ISO format
                },
              },
            },
          };

          // Convert value to Date
          const convertedValue = new Date(condition.value);

          // Handle date operators with the converted field
          switch (condition.operator) {
            case 'before':
              matchConditions[convertedField] = { $lt: convertedValue };
              break;
            case 'after':
              matchConditions[convertedField] = { $gt: convertedValue };
              break;
            case 'on':
            case 'noton': {
              const startOfDay = new Date(convertedValue);
              startOfDay.setUTCHours(0, 0, 0, 0);
              const endOfDay = new Date(convertedValue);
              endOfDay.setUTCHours(23, 59, 59, 999);
              matchConditions[convertedField] =
                condition.operator === 'on'
                  ? { $gte: startOfDay, $lt: endOfDay }
                  : { $not: { $gte: startOfDay, $lt: endOfDay } };
              break;
            }
          }
        } else {
          // Convert value based on field type
          let convertedValue = condition.value;
          if (fieldType === 'number') {
            convertedValue = Number(condition.value);
          } else if (fieldType === 'date') {
            convertedValue = new Date(condition.value);
          } else if (fieldType === 'boolean') {
            convertedValue = condition.value === 'true';
          }

          // Handle operators based on field type
          switch (fieldType) {
            case 'number':
              handleNumberOperators(condition, convertedValue, fieldPath, matchConditions);
              break;
            case 'string':
              handleStringOperators(condition, convertedValue, fieldPath, matchConditions);
              break;
            case 'date':
              handleDateOperators(condition, convertedValue, fieldPath, matchConditions);
              break;
            case 'boolean':
              handleBooleanOperators(condition, convertedValue, fieldPath, matchConditions);
              break;
            default:
              handleDefaultOperators(condition, convertedValue, fieldPath, matchConditions);
              break;
          }
        }
      } else {
        // Handle multiple conditions for the same field
        // Check if we have numeric range conditions (lt, gt, etc.)
        const hasNumericRange = conditions.some(
          (c) => fieldType === 'number' && ['lt', 'lte', 'gt', 'gte'].includes(c.operator)
        );

        if (hasNumericRange) {
          // For numeric ranges, we need to combine conditions with $and
          const numericConditions = {};

          conditions.forEach((condition) => {
            if (['lt', 'lte', 'gt', 'gte'].includes(condition.operator)) {
              const convertedValue = Number(condition.value);
              if (!numericConditions[fieldName]) {
                numericConditions[fieldName] = {};
              }
              numericConditions[fieldName][`$${condition.operator}`] = convertedValue;
            }
          });

          // Add the combined numeric conditions to matchConditions
          if (Object.keys(numericConditions).length > 0) {
            matchConditions[fieldName] = numericConditions[fieldName];
          }

          // Handle any remaining non-numeric conditions with $or
          const nonNumericConditions = conditions.filter((c) => !['lt', 'lte', 'gt', 'gte'].includes(c.operator));

          if (nonNumericConditions.length > 0) {
            const orConditions = nonNumericConditions
              .map((condition) => {
                const convertedValue =
                  fieldType === 'number'
                    ? Number(condition.value)
                    : fieldType === 'date'
                      ? new Date(condition.value)
                      : fieldType === 'boolean'
                        ? condition.value === 'true'
                        : condition.value;

                const conditionObj = {};
                switch (condition.operator) {
                  case 'eq':
                    conditionObj[fieldName] = convertedValue;
                    break;
                  case 'ne':
                    conditionObj[fieldName] = { $ne: convertedValue };
                    break;
                  case 'contains':
                    conditionObj[fieldName] = {
                      $regex: convertedValue,
                      $options: 'i',
                    };
                    break;
                  case 'notcontains':
                    conditionObj[fieldName] = {
                      $not: { $regex: convertedValue, $options: 'i' },
                    };
                    break;
                  case 'startswith':
                    conditionObj[fieldName] = {
                      $regex: `^${convertedValue}`,
                      $options: 'i',
                    };
                    break;
                  case 'endswith':
                    conditionObj[fieldName] = {
                      $regex: `${convertedValue}$`,
                      $options: 'i',
                    };
                    break;
                  case 'blank':
                    conditionObj[fieldName] = null;
                    break;
                  case 'notblank':
                    conditionObj[fieldName] = { $ne: null };
                    break;
                  default:
                    console.warn(`Unsupported operator: ${condition.operator}`);
                    return null;
                }
                return conditionObj;
              })
              .filter(Boolean);

            if (orConditions.length > 0) {
              matchConditions.$or = matchConditions.$or || [];
              matchConditions.$or.push(...orConditions);
            }
          }
        } else {
          // Handle multiple non-numeric conditions for the same field using $or
          const orConditions = conditions
            .map((condition) => {
              const convertedValue =
                fieldType === 'number'
                  ? Number(condition.value)
                  : fieldType === 'date'
                    ? new Date(condition.value)
                    : fieldType === 'boolean'
                      ? condition.value === 'true'
                      : condition.value;

              const conditionObj: Record<string, any> = {};
              switch (condition.operator) {
                case 'eq':
                  conditionObj[fieldName] = convertedValue;
                  break;
                case 'ne':
                  conditionObj[fieldName] = { $ne: convertedValue };
                  break;
                case 'contains':
                  conditionObj[fieldName] = {
                    $regex: convertedValue,
                    $options: 'i',
                  };
                  break;
                case 'notcontains':
                  conditionObj[fieldName] = {
                    $not: { $regex: convertedValue, $options: 'i' },
                  };
                  break;
                case 'startswith':
                  conditionObj[fieldName] = {
                    $regex: `^${convertedValue}`,
                    $options: 'i',
                  };
                  break;
                case 'endswith':
                  conditionObj[fieldName] = {
                    $regex: `${convertedValue}$`,
                    $options: 'i',
                  };
                  break;
                case 'blank':
                  conditionObj[fieldName] = null;
                  break;
                case 'notblank':
                  conditionObj[fieldName] = { $ne: null };
                  break;
                default:
                  console.warn(`Unsupported operator: ${condition.operator}`);
                  return null;
              }
              return conditionObj;
            })
            .filter(Boolean);

          if (orConditions.length > 0) {
            matchConditions.$or = matchConditions.$or || [];
            matchConditions.$or.push(...orConditions);
          }
        }
      }
    });

    const detailPipeline: any[] = [];

    if (Object.keys(dateConversions).length > 0) {
      detailPipeline.push({ $addFields: dateConversions });
    }

    detailPipeline.push(
      { $match: matchConditions },
      {
        $project: {
          _id: 0,
          rowData: 1,
        },
      },
      {
        $replaceRoot: {
          newRoot: '$rowData',
        },
      },
      {
        $facet: {
          metadata: [{ $count: 'totalRecords' }],
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        },
      },
      {
        $project: {
          data: 1,
          pagination: {
            currentPage: page,
            limit: limit,
            totalRecords: { $arrayElemAt: ['$metadata.totalRecords', 0] },
            totalPages: {
              $ceil: {
                $divide: [{ $arrayElemAt: ['$metadata.totalRecords', 0] }, limit],
              },
            },
          },
        },
      }
    );

    const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: dataSource?.code,
    });
    const DataSourceModel = createDefaultDataSourceVersionModel(schemaName);

    const detailedData = await DataSourceModel.aggregate(detailPipeline).exec();

    const headers = entity?.attributes.map((attr: any) => attr.name);
    // 6. Prepare response
    const response = {
      success: true,
      message: 'Detailed chart data fetched successfully',
      data: detailedData[0]?.data || [],
      pagination: detailedData[0]?.pagination || {},
      headers,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error('Error in getWidgetClickData:', err);
    next(err);
  }
};
