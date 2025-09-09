/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';

import * as dataSourceService from '../../../database/services/common/dataSource.services';
import * as defaultDataSourceVersionValue from '../../../database/services/common/defaultDataSourceVersionValue.services';
import * as entityService from '../../../database/services/common/entity.services';
import { getSchemaNameBasedOnVersionCodeAndOrgCode } from '../../../utils/common.utils';
import createDefaultDataSourceVersionModel from '../../../database/models/common/defaultDataSourceVersionModel';
import * as dataSourceVersionService from '../../../database/services/common/dataSourceVersion.services';
import { DataSourceVersion } from '../../../types/widget.types';
import { processFieldConditions } from '../../../utils/conditionProcessor';
import * as cacheService from '../../../database/services/reportivix/aiCache.service';
import { DateTime } from 'luxon';
import Entity from '../../../database/models/common/entity';
import { findDerivedFieldById } from '../../../database/services/common/derivedField.services';

export const createDataSourcce = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      entityId,
      name,
      code,
      versionType,
      description,
      uniqueAttributeRules,
      isShowMenu,
      fieldSettings = [],
      condition = [],
    } = req.body;

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
      uniqueAttributeRules,
      isShowMenu,
      condition,
      fieldSettings, // save directly
    });

    const cacheData = await cacheService.findCacheDataByCodeAndOrganization('chart', organizationId);
    if (cacheData) {
      const nowISO = DateTime.now().minus({ days: 2 }).toISO();
      await cacheService.updateCacheData(cacheData._id.toString(), { updatedAt: nowISO });
    }

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
    const {
      name,
      versionType,
      description,
      uniqueAttributeRules,
      isShowMenu,
      fieldSettings = [],
      condition = [],
    } = req.body;

    const { userId } = req.user;

    await dataSourceService.updateDataSource(req.params.dataSourceId, {
      name,
      versionType,
      updatedBy: userId,
      description,
      uniqueAttributeRules,
      isShowMenu,
      condition,
      fieldSettings, // save directly
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
    const { search } = req.query;
    const paginate = String(req.query.paginate).toLowerCase() === 'true';
    const canEditInline = String(req.query.canEditInline).toLowerCase() === 'true';
    const isShowMenu = String(req.query.isShowMenu).toLowerCase() === 'true';
    const isAllowPermission = String(req.query.isAllowPermission).toLowerCase() === 'true';

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const { organizationId } = req.user;

    const query: any = { organizationId, isVisible: true };

    // Search filter
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Individual flag filters
    if (canEditInline && !isAllowPermission) {
      query['canEditInline'] = true;
    }
    if (isShowMenu && !isAllowPermission) {
      query['isShowMenu'] = true;
    }

    // OR condition for permission mode
    if (isAllowPermission) {
      query.$or = [{ isShowMenu: true }, { canEditInline: true }];
    }

    const populate = paginate
      ? [
          { path: 'createdBy', select: 'firstName lastName' },
          { path: 'updatedBy', select: 'firstName lastName' },
          { path: 'entityId', select: 'name attributes canEditInline' },
        ]
      : [{ path: 'entityId', select: 'name attributes' }];

    const result = await dataSourceService.getDataSourceList({
      query,
      page,
      limit,
      populate,
      paginate,
    });

    const data = Array.isArray(result.data)
      ? await Promise.all(
          result.data.map(async (ds: any) => {
            const attributeMap = new Map<string, any>();
            if (ds.entityId?.attributes?.length) {
              for (const attr of ds.entityId.attributes) {
                // Ensure default only if not already set
                if (attr.isReferenceField === undefined) {
                  const ref = attr.referenceEntitySetting;
                  attr.isReferenceField = !!(
                    ref?.refEntityId && !['mapping_many_to_one', 'mapping_one_to_one'].includes(ref.relationType)
                  );
                }

                attributeMap.set(String(attr._id), attr);

                const refSetting = attr.referenceEntitySetting;

                // Only dive into reference entity if relationType is mapping_*
                if (
                  refSetting?.refEntityId &&
                  ['mapping_many_to_one', 'mapping_one_to_one'].includes(refSetting.relationType)
                ) {
                  // fetch referenced entity (level 1)
                  const refEntity: any = await entityService.findEntityById(refSetting.refEntityId.toString());

                  if (refEntity?.attributes?.length) {
                    for (const refAttr of refEntity.attributes) {
                      // Skip the main reference field itself (the join/display field)
                      if (String(refAttr._id) === String(refSetting.refEntityField)) continue;

                      const refAttrId = refAttr._id.toString();
                      if (attributeMap.has(refAttrId)) continue;

                      // Start with parent + first-level sub-attr
                      let computedName = `${attr.name}.${refAttr.name}`;

                      // If this sub-attr is itself a reference, append ONLY its display field name
                      const subRef = refAttr.referenceEntitySetting;
                      if (subRef?.refEntityId && subRef?.refEntityField) {
                        const subEntity: any = await entityService.findEntityById(subRef.refEntityId.toString());

                        const displayAttr = subEntity?.attributes?.find(
                          (a: any) => String(a._id) === String(subRef.refEntityField)
                        );

                        if (displayAttr?.name) {
                          // Append display field name once and STOP
                          computedName = `${computedName}.${displayAttr.name}`;
                        }
                      }

                      // Clone and adjust
                      const newAttr = { ...(refAttr.toObject?.() || refAttr) };
                      newAttr.name = computedName;
                      newAttr.isReferenceField = true;

                      attributeMap.set(refAttrId, newAttr);
                      ds.entityId.attributes.push(newAttr);
                    }
                  }
                }
              }
            }

            if (Array.isArray(ds.entityId?.attributes) && Array.isArray(ds.fieldSettings)) {
              for (const attr of ds.entityId.attributes) {
                const matchField = ds.fieldSettings.find((f: any) => {
                  if (attr.referenceEntitySetting) {
                    // refAttributeId is always array → pick last element
                    const lastRef = f.refAttributeId?.[f.refAttributeId.length - 1];
                    return String(lastRef) === String(attr._id);
                  } else {
                    // Direct match with attributeId
                    return String(f.attributeId) === String(attr._id);
                  }
                });

                attr.label = matchField?.label || attr.name;

                // Ensure default false if still undefined
                if (attr.isReferenceField === undefined) {
                  attr.isReferenceField = false;
                }
              }
            }

            // Precompute all field options for this entity
            const fieldOptions = await entityService.getEntityFieldOptions(ds.entityId._id.toString());

            if (Array.isArray(ds.fieldSettings)) {
              for (const field of ds.fieldSettings) {
                // Derived fields
                if (field.isDerived && field.attributeId) {
                  const derived = await findDerivedFieldById(field.attributeId);
                  if (derived) {
                    field.mappedAttributeName = `Derived.${derived.name}`;
                    field.values = Array.isArray(derived.valueRules) ? derived.valueRules.map((vr) => vr.value) : [];
                  }
                  continue;
                }

                // Normal fields → just look up in fieldOptions
                const match = fieldOptions.find(
                  (opt) =>
                    String(opt.value.attributeId) === String(field.attributeId) &&
                    JSON.stringify(opt.value.refAttributeId || []) === JSON.stringify(field.refAttributeId || [])
                );

                if (match) {
                  field.mappedAttributeName = match.label;
                } else {
                  field.mappedAttributeName = 'Unknown';
                }
              }
            }

            ds.uniqueAttributeRules = Array.isArray(ds.uniqueAttributeRules)
              ? ds.uniqueAttributeRules.map((ruleGroup: any[]) =>
                  Array.isArray(ruleGroup)
                    ? ruleGroup.map((attrId: Types.ObjectId) => ({
                        _id: attrId,
                        name: attributeMap.get(String(attrId))?.name || 'Unknown',
                      }))
                    : []
                )
              : [];

             // ---------- NEW: fetch version info ----------
            const latestVersion = await dataSourceVersionService.getDataSourceVersion({
              query: { dataSourceId: ds._id },
              populate: [],
              sort: { createdAt: -1 },
            });

            const lastUploadedVersion: any = await dataSourceVersionService.getDataSourceVersion({
              query: { dataSourceId: ds._id, status: 'completed', isCurrent: true },
              populate: [],
              sort: { createdAt: -1 },
            });

            return {
              ...ds.toObject?.() || ds,
              dataSourceVersion: latestVersion || null,
              lastUploadedDate: lastUploadedVersion ? lastUploadedVersion.createdAt : null,
            };
          })
        )
      : [];

    res.status(200).json({
      success: true,
      message: 'Data Source Fetched Successfully',
      data,
      totalCount: result.totalCount || 0,
    });
  } catch (err) {
    next(err);
  }
};

export const getDataSourceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // existing call to service
    const dataSourceDetails: any = await dataSourceService.findDataSourceById(req.params.dataSourceId);

    if (!dataSourceDetails) {
      return res.status(404).json({
        success: false,
        message: 'Data Source not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Data Source Details Fetched Successfully',
      data: dataSourceDetails
    });
  } catch (err) {
    next(err);
  }
};


export const getDataSourceWithFieldOptionDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dataSourceDetails: any = await dataSourceService.findDataSourceById(req.params.dataSourceId);
    const entityFieldOptions = await entityService.getEntityFieldOptions(dataSourceDetails?.entityId?._id);
    // Convert to plain object with type assertion so TypeScript allows adding custom props
    const dataSourceObject = (dataSourceDetails?.toObject ? dataSourceDetails.toObject() : dataSourceDetails) as any;

    // Append the custom field
    dataSourceObject.entityFieldOptions = entityFieldOptions;
    res.status(200).json({
      success: true,
      message: 'Data Source Details Fetched Successfully',
      data: dataSourceObject,
    });
  } catch (err) {
    next(err);
  }
};

export const getWidgetDataByFilter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dataSourceId, conditions, entityId, dimensions, groupBy, dashBoardType, dashboardFilters } = req.body;

    let startVersionValue = dashboardFilters?.startVersionValue;
    let endVersionValue = dashboardFilters?.endVersionValue;
    let dynamicVersionValue = dashboardFilters?.dynamicVersionValue;
    let versionValue = dashboardFilters?.versionValue;

    if (dashBoardType === 'normal' && versionValue && !!dynamicVersionValue) {
      startVersionValue = versionValue;
      endVersionValue = versionValue;
    }

    // const { sortBy } = req.query as any;
    const page = parseInt(req.body.page as string, 10) || 1;
    const limit = parseInt(req.body.limit as string, 10) || 10;
    const skip = (Number(page) - 1) * Number(limit);
    const { orgCode } = req.user;

    // 1. Fetch entity and data source information
    const entity: any = await entityService.getEntity({
      _id: entityId || dataSourceId,
    });

    if (!entity) {
      throw new Error('Entity not found');
    }

    const dataSource: any = await dataSourceService.getDataSource({
      _id: dataSourceId,
    });

    // 2. Fetch current active data source version
    // const dataSourceVersion: any = (await dataSourceVersionService.getDataSourceVersion({
    //   query: {
    //     dataSourceId: dataSourceId,
    //     isCurrent: true,
    //     isActive: true,
    //   },
    //   sort: { versionValue: -1 },
    // })) as DataSourceVersion;

    let dataSourceVersion: any;
    if (startVersionValue && endVersionValue) {
      dataSourceVersion = await dataSourceVersionService.getDataSourceVersionList({
        query: {
          dataSourceId: dataSourceId,
          isCurrent: true,
          isActive: true,
          versionValue: { $gte: startVersionValue, $lte: endVersionValue },
        },
        sort: { versionValue: -1 },
      });

      dataSourceVersion = dataSourceVersion.data as DataSourceVersion[];
    } else {
      dataSourceVersion = (await dataSourceVersionService.getDataSourceVersion({
        query: {
          dataSourceId: dataSourceId,
          isCurrent: true,
          isActive: true,
        },
        sort: { versionValue: -1 },
      })) as DataSourceVersion;

      dataSourceVersion = [dataSourceVersion];
    }

    // if (!dataSourceVersion) {
    //   throw new Error('No active data source version found');
    // }

    const headers = entity?.attributes.map((attr: any) => attr.name);
    if (!dataSourceVersion || dataSourceVersion.length === 0) {
      // throw new Error('No active data source version found');

      res.status(200).json({
        success: true,
        message: 'Detailed chart data fetched successfully',
        data: [],
        pagination: {},
        headers,
      });
    }

    const dataSourceVersionIdArray = dataSourceVersion.map((data) => new Types.ObjectId(data._id.toString()));
    // Helper function to get field type from entity
    const getFieldType = (fieldName: string) => {
      const attribute = entity.attributes.find((attr: any) => attr.name === fieldName);
      return attribute ? attribute.type : 'string';
    };

    // Group conditions by field
    const conditionsByField: Record<string, any[]> = {};
    conditions?.forEach((condition) => {
      if (!conditionsByField[condition.field]) {
        conditionsByField[condition.field] = [];
      }
      conditionsByField[condition.field].push(condition);
    });

    // Use the common utility to process conditions
    const initialMatchConditions = {
      dataSourceId: new Types.ObjectId(dataSourceId),
      dataSourceVersionId: { $in: dataSourceVersionIdArray },
    };

    // Add dimension conditions to match
    if (dimensions && Array.isArray(dimensions)) {
      dimensions.forEach((dimension) => {
        const [field, value] = Object.entries(dimension)[0];
        if (dashBoardType === 'trend') {
          initialMatchConditions[`${field}`] = value;
        } else {
          initialMatchConditions[`rowData.${field}`] = value;
        }
      });
    }

    // Add groupBy conditions to match
    if (groupBy && Array.isArray(groupBy)) {
      groupBy.forEach((group) => {
        const [field, value] = Object.entries(group)[0];
        initialMatchConditions[`rowData.${field}`] = value;
      });
    }

    const { matchConditions, dateConversions } = processFieldConditions(
      conditionsByField,
      getFieldType,
      initialMatchConditions
    );

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
          data: [{ $skip: skip }, { $limit: limit }],
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
