/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';

import * as dataSourceService from '../../../database/services/common/dataSource.services';
import * as defaultDataSourceVersionValue from '../../../database/services/common/defaultDataSourceVersionValue.services';
import * as entityService from '../../../database/services/common/entity.services';
import { checkReferenceFieldExist, formatDateTime, getSchemaNameBasedOnVersionCodeAndOrgCode, getSortFieldFromArray } from '../../../utils/common.utils';
import createDefaultDataSourceVersionModel from '../../../database/models/common/defaultDataSourceVersionModel';
import * as dataSourceVersionService from '../../../database/services/common/dataSourceVersion.services';
import { DataSourceVersion } from '../../../types/widget.types';
import { processFieldConditions } from '../../../utils/conditionProcessor';
import * as cacheService from '../../../database/services/common/aiCache.service';
import { DateTime } from 'luxon';
import Entity from '../../../database/models/common/entity';
import { findDerivedFieldById } from '../../../database/services/common/derivedField.services';
import { getUserDataPermissionRecord } from '../../../database/services/common/userDataPermission.service';
import ExcelJS from "exceljs";
import { createDownloadRequest } from '../../../database/services/common/downloadRequest.service';
import { Queue } from 'bullmq';
import { getPlotTypeConfig, plotTypesConfig } from "../../../config/plotType.config";
import { getVisibilitySettingService, listVisibilitySettingService } from '../../../database/services/common/organizationVisibilitySettingService';

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

    // await defaultDataSourceVersionValue.createEmptyCollection(collectionName);

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
      condition, // don't default here
    } = req.body;

    const { userId } = req.user;

    const updatePayload: any = {
      name,
      versionType,
      updatedBy: userId,
      description,
      uniqueAttributeRules,
      isShowMenu,
      fieldSettings,
    };

    // only set condition if it’s present in the body
    if (condition !== undefined) {
      updatePayload.condition = condition;
    }

    await dataSourceService.updateDataSource(req.params.dataSourceId, updatePayload);

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


      // Fetch visibility settings using service
    const visibilitySettings = await getVisibilitySettingService(organizationId);

    const data = Array.isArray(result.data)
      ? await Promise.all(
          result.data.map(async (ds: any) => {

             // Apply DataSource-level visibility
           // Apply DataSource-level visibility
const dsVisibility = visibilitySettings?.find(
  (v: any) => v.dataSourceId?.toString() === ds._id.toString() && !v.attributeId
);

ds.visibility = dsVisibility?.visibility || 'primary';



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
            const fieldOptions: any = await entityService.getEntityFieldOptions(ds.entityId._id.toString());

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
                  field.optionAttributeId = match?.value?.optionAttributeId || null;
                } else {
                  field.mappedAttributeName = 'Unknown';
                  field.optionAttributeId = null;
                }
              }
               // Apply field-level visibility
            // Apply field-level visibility
            if (Array.isArray(ds.fieldSettings)) {
              ds.fieldSettings = ds.fieldSettings
                .map((field: any) => {
                  const fieldVisibility = visibilitySettings?.find(
                    (v: any) =>
                      v.dataSourceId?.toString() === ds._id.toString() &&
                      v.attributeId?.toString() === field.attributeId.toString() &&
                      JSON.stringify(v.refAttributeId || []) === JSON.stringify(field.refAttributeId || [])
                  );
                  field.visibility = fieldVisibility?.visibility || 'primary';
                  return field;
                })
                .filter(Boolean);
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

            const allDataSourceVersions = await dataSourceVersionService.getAllDataSourceVersions({
              query: { dataSourceId: ds._id },
              populate: ['vendorId'],
              sort: { createdAt: -1 },
            });

            return {
              ...ds.toObject?.() || ds,
              dataSourceVersion: latestVersion || null,
              lastUploadedDate: lastUploadedVersion ? lastUploadedVersion.createdAt : null,
              allDataSourceVersions
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
    let { organizationId, isSuperUser } = req.user as any;
    const { organizationId: paramOrgId } = req.query;
    if (isSuperUser && paramOrgId) organizationId = paramOrgId;

    const ds: any = await dataSourceService.findDataSourceById(req.params.dataSourceId);
    if (!ds) return res.status(404).json({ success: false, message: 'Data Source not found' });

    // Fetch all visibility settings for the organization
    const visibilitySettings: any[] = await getVisibilitySettingService(organizationId); // returns array

    // Apply DataSource-level visibility
    const dsVisibility = visibilitySettings.find(
      (v) => v.dataSourceId?.toString() === ds._id.toString() && !v.attributeId
    );
    ds.visibility = dsVisibility?.visibility || 'primary';

    // Apply field-level visibility
    if (Array.isArray(ds.fieldSettings)) {
      ds.fieldSettings = ds.fieldSettings
        .map((field: any) => {
          const fieldVisibility = visibilitySettings.find(
            (v) =>
              v.dataSourceId?.toString() === ds._id.toString() &&
              v.attributeId?.toString() === field.attributeId.toString() &&
              JSON.stringify(v.refAttributeId || []) === JSON.stringify(field.refAttributeId || [])
          );
          // if (fieldVisibility?.visibility === 'hide') return null; // uncomment to hide fields completely
          field.visibility = fieldVisibility?.visibility || 'primary';
          return field;
        })
        .filter(Boolean);
    }

    res.status(200).json({
      success: true,
      message: 'Data Source Details Fetched Successfully',
      data: ds,
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
    let { dataSourceId, conditions, entityId, dimensions, groupBy, dashBoardType, dashboardFilters = {}, plotType, sort, aggregation } = req.body;

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
    const { orgCode, userId, organizationId } = req.user;


    // ✅ Fetch user-level data permission record
    const userPermission = await getUserDataPermissionRecord({
      userId,
      dataSourceId,
      organizationId,
    });

    // ✅ Merge user conditions with incoming conditions
    if (userPermission?.conditions?.length) {
        const userConditionsMap = new Map(
          userPermission.conditions.map((c: any) => [c.field, c])
        );

        // Merge in one pass
        const mergedMap = new Map();

        // Step 1: Start with payload conditions (✅ minimal change here)
        for (const cond of conditions || []) {
          if (userConditionsMap.has(cond.field)) {
            // if field exists in userPermission → normal overwrite behavior
            mergedMap.set(cond.field, cond);
          } else {
            // if field NOT in userPermission → keep all conditions (before/after etc.)
            mergedMap.set(`${cond.field}_${cond.operator}`, cond);
          }
        }

        // Step 2: Overwrite or add user permission conditions
        for (const [field, cond] of userConditionsMap.entries()) {
          mergedMap.set(field, cond);
        }

        // Step 3: Convert back to array
        conditions = Array.from(mergedMap.values());
    }


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
    
    let headers: Record <string, any[]> = entity?.attributes.map((attr: any) => attr.name);
    const isReferenceField = await checkReferenceFieldExist(dataSource);
    if(isReferenceField == true){
      headers = dataSource?.fieldSettings.map((field: any) => field.label);
    }
    
   
    
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

    const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: dataSource?.code,
    });
    
    let dataResults: any;
    let pagination: any;

    const isDefaultForce = true;

    if (isReferenceField || isDefaultForce == true) {
  const query = {
    dataSourceId: new Types.ObjectId(dataSourceId),
    dataSourceVersionId: { $in: dataSourceVersionIdArray.map(id => new Types.ObjectId(id)) },
    status: "active",
  };

  // const filters: Record<string, any> = dashboardFilters?.filters ?? {};
  const filters: Record<string, any> = {};
  let dueDaysFilterValue: string | null = null;

  const isDueDaysField = (key: string) => key === "Derived.dueDays";

  // Determine case status
  const statusFilter = dashboardFilters?.filters?.["Derived.Case Status"] ?? "Pending";
  const isCompleted = statusFilter === "Completed";
// ---------------------------
// 1. Determine date grouping mode from groupBy using config file
// ---------------------------
let dateGroupingMode: string | null = null;

if (plotType) {
  const secondGroupBy = Array.isArray(plotType) ? plotType[0] : plotType;

  // dynamic valid plot types from config
  const validModes = plotTypesConfig.map(pt => pt.type.toLowerCase());

  if (typeof secondGroupBy === "string" && validModes.includes(secondGroupBy.toLowerCase())) {
    dateGroupingMode = secondGroupBy.toLowerCase();
  }
}

// ---------------------------
// 2. If date grouping mode exists, handle it separately
// ---------------------------
  const getDateGroupingModeCondition = async(field, value) => {
    if (value != null) {
      const raw = String(value);

      let startDate: Date | null = null;
      let endDate: Date | null = null;

      const config = getPlotTypeConfig(dateGroupingMode as any);

      // ----------------------------------
      // MONTHLY / WEEKLY / YEARLY / DAILY
      // ----------------------------------
      if (dateGroupingMode === "monthly") {
        const [yr, mon] = raw.split("-");
        startDate = new Date(Date.UTC(+yr, +mon - 1, 1));
        endDate = new Date(Date.UTC(+yr, +mon, 0));
      }
      else if (dateGroupingMode === "weekly") {
        const [from, to] = raw.split("~");
        startDate = new Date(Date.UTC(new Date(from).getUTCFullYear(), new Date(from).getUTCMonth(), new Date(from).getUTCDate()));
        endDate = new Date(Date.UTC(new Date(to).getUTCFullYear(),   new Date(to).getUTCMonth(),   new Date(to).getUTCDate()));
      }
      else if (dateGroupingMode === "yearly") {
        startDate = new Date(Date.UTC(+raw, 0, 1));
        endDate = new Date(Date.UTC(+raw, 11, 31));
      }
      else if (dateGroupingMode === "daily") {
        const d = new Date(raw);
        startDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        endDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      }

      // ----------------------------------
      // QUARTERS — Now using monthRange from config
      // ----------------------------------
      else if (dateGroupingMode === "quarterly" && config?.monthRange) {
        const [yearStr, quarterStr] = raw.split("-");
        const year = +yearStr;
        const quarterKey = quarterStr.toLowerCase() as keyof typeof config.monthRange;

        const range = config.monthRange[quarterKey];

        if (range) {
          const [startMonth, endMonth] = range;
          startDate = new Date(Date.UTC(year, startMonth, 1));
          endDate = new Date(Date.UTC(year, endMonth + 1, 0));
        }
      }

      if (startDate && endDate) {
        filters[field] = { $gte: startDate, $lte: endDate };
      }
    }
  }
  const isDateField = (field: string) =>
  dataSource.fieldSettings.some((f) => {
    const matchField =
      f.mappedAttributeName === field || f.label === field;

    return matchField && (f.type === "date" || f.type === "date-range");
  });
  // Handle dimensions
  if (dimensions && Array.isArray(dimensions)) {
    dimensions.forEach(dimension => {
      if (dimension && typeof dimension === "object" && Object.keys(dimension).length > 0) {
        const [field, value] = Object.entries(dimension)[0];
        if (isDueDaysField(field)) {
          dueDaysFilterValue = value as string;
        } else if (dashBoardType === "trend") {
          query[`${field}`] = value;
        } else if(isDateField(field) && dateGroupingMode){
          getDateGroupingModeCondition(field, value);
        }else{
          filters[`${field}`] = value === "Unknown" ? { $in: [null, "", "Unknown"] } : value;
        }
      }
    });
  }


  // Handle groupBy
  if (groupBy && Array.isArray(groupBy)) {
    groupBy.forEach(group => {
      if (group && typeof group === "object" && Object.keys(group).length > 0) {
        const [field, value] = Object.entries(group)[0];
        if (isDueDaysField(field)) {
          dueDaysFilterValue = value as string;
        } else if(isDateField(field) && dateGroupingMode){
          getDateGroupingModeCondition(field, value);
        } else {
          filters[`${field}`] = value === "Unknown" ? { $in: [null, "", "Unknown"] } : value;
        }
      }
    });
  }

// -----------------------------
// NEW SORTING PRIORITY LOGIC
// -----------------------------
let effectiveSortBy = sort;

// Apply default sort ONLY if sort is not provided
if (!effectiveSortBy || Object.keys(effectiveSortBy).length === 0) {
  let sortField: string | null = null;

  // 1️ Try groupBy first
  if (Array.isArray(groupBy) && groupBy.length > 0) {
    sortField = getSortFieldFromArray(groupBy);
  }
  // 2️ Then try dimensions
  else if (Array.isArray(dimensions) && dimensions.length > 0) {
    sortField = getSortFieldFromArray(dimensions);
  }

  effectiveSortBy = sortField ? { [sortField]: 1 } : {};
}








  // Handle dueDays filter using DueDate/DateTaken
  if (dueDaysFilterValue && dueDaysFilterValue !== "Total Dues") {
    const now = new Date();
    const bucketMap: Record<string, [number, number]> = isCompleted
      ? {
          "0-1 Months": [0, 30],
          "2-3 Months": [31, 90],
          "4-6 Months": [91, 180],
          "7-12 Months": [181, 365],
        }
      : {
          "0-3 Days": [0, 3],
          "4-7 Days": [4, 7],
          "8-15 Days": [8, 15],
          "16-30 Days": [16, 30],
        };

    const range = bucketMap[dueDaysFilterValue];
    if (range) {
      const [startDays, endDays] = range;
      const dateField = isCompleted ? "DateTaken" : "DueDate";

      // Only consider date portion, always midnight
      const startDate = new Date(now);
      startDate.setUTCDate(startDate.getUTCDate() + (isCompleted ? -endDays : startDays));
      startDate.setUTCHours(0, 0, 0, 0);

      const endDate = new Date(now);
      endDate.setUTCDate(endDate.getUTCDate() + (isCompleted ? -startDays : endDays));
      endDate.setUTCHours(0, 0, 0, 0);


      // Add date range to filters directly
      filters[`${dateField}`] = { $gte: startDate, $lte: endDate };
    }
  }
  // Assign filters to dashboardFilters
  dashboardFilters.chartFilters = filters;

  // Fetch data
  const result = await defaultDataSourceVersionValue.getDataSourceVersionValueWidgetDataV2({
    schemaName,
    query,
    dashboardFilters,
    entityId: dataSource.entityId,
    aggregation: { type: aggregation?.type || "count", attributeName: aggregation?.attributeName || "_id" },
    conditions,
    dashBoardType,
    dataSourceDetails: dataSource,
    isPaginate: true,
    page,
    limit,
    sort: effectiveSortBy,   // <<---- NEW
  });

  console.log("results", JSON.stringify(result));
  dataResults = result?.data ?? [];
  pagination = result?.pagination || {};
}else{
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

      
      const DataSourceModel = createDefaultDataSourceVersionModel(schemaName);

      const detailedData = await DataSourceModel.aggregate(detailPipeline).exec();

      dataResults = detailedData[0]?.data || [];
      pagination = detailedData[0]?.pagination || {};

  }

  


    // 6. Prepare response
    const response = {
      success: true,
      message: 'Detailed chart data fetched successfully',
      data: dataResults,
      pagination: pagination,
      headers,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error('Error in getWidgetClickData:', err);
    next(err);
  }
};

export const exportWidgetDataByFilterToExcel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    //  Reuse the full existing logic from getWidgetDataByFilter — NO CHANGES
    let {
      dataSourceId,
      conditions,
      entityId,
      dimensions,
      groupBy,
      dashBoardType,
      dashboardFilters = {},
      plotType,
      selectedFields, // Optional
      sort,
      aggregation
    } = req.body;

    let startVersionValue = dashboardFilters?.startVersionValue;
    let endVersionValue = dashboardFilters?.endVersionValue;
    let dynamicVersionValue = dashboardFilters?.dynamicVersionValue;
    let versionValue = dashboardFilters?.versionValue;

    if (dashBoardType === "normal" && versionValue && !!dynamicVersionValue) {
      startVersionValue = versionValue;
      endVersionValue = versionValue;
    }

    const page = 1;
    const limit = Number.MAX_SAFE_INTEGER;
    const skip = (Number(page) - 1) * Number(limit);
    const { orgCode, userId, organizationId } = req.user;

    //  User permission logic (unchanged)
    const userPermission = await getUserDataPermissionRecord({
      userId,
      dataSourceId,
      organizationId,
    });

    if (userPermission?.conditions?.length) {
        const userConditionsMap = new Map(
          userPermission.conditions.map((c: any) => [c.field, c])
        );

        // Merge in one pass
        const mergedMap = new Map();

        // Step 1: Start with payload conditions (✅ minimal change here)
        for (const cond of conditions || []) {
          if (userConditionsMap.has(cond.field)) {
            // if field exists in userPermission → normal overwrite behavior
            mergedMap.set(cond.field, cond);
          } else {
            // if field NOT in userPermission → keep all conditions (before/after etc.)
            mergedMap.set(`${cond.field}_${cond.operator}`, cond);
          }
        }

        // Step 2: Overwrite or add user permission conditions
        for (const [field, cond] of userConditionsMap.entries()) {
          mergedMap.set(field, cond);
        }

        // Step 3: Convert back to array
        conditions = Array.from(mergedMap.values());
    }

    //  Entity and data source fetching (same)
    const entity: any = await entityService.getEntity({
      _id: entityId || dataSourceId,
    });
    if (!entity) throw new Error("Entity not found");

    const dataSource: any = await dataSourceService.getDataSource({
      _id: dataSourceId,
    });

    //  Version fetching (same)
    let dataSourceVersion: any;
    if (startVersionValue && endVersionValue) {
      const versions = await dataSourceVersionService.getDataSourceVersionList({
        query: {
          dataSourceId: dataSourceId,
          isCurrent: true,
          isActive: true,
          versionValue: { $gte: startVersionValue, $lte: endVersionValue },
        },
        sort: { versionValue: -1 },
      });
      dataSourceVersion = versions.data;
    } else {
      const versions = await dataSourceVersionService.getDataSourceVersionList({
        query: { dataSourceId, isCurrent: true, isActive: true },
        sort: { versionValue: -1 },
      });
      dataSourceVersion = versions.data;
    }

    const isReferenceField = await checkReferenceFieldExist(dataSource);

    let headers: string[] = isReferenceField
      ? dataSource?.fieldSettings.map((f: any) => f.label)
      : entity?.attributes.map((a: any) => a.name);

    if (!dataSourceVersion || dataSourceVersion.length === 0) {
      res.status(200).json({
        success: true,
        message: "No active data source version found",
        data: [],
        pagination: {},
        headers,
      });
    }

    const dataSourceVersionIdArray = dataSourceVersion.map(
      (d) => new Types.ObjectId(d._id)
    );

    const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: dataSource.code,
    });

    //  KEEPING THE ENTIRE DATA LOGIC SAME
    let dataResults: any;
    let pagination: any;

    // if (isReferenceField) {
      const query = {
        dataSourceId: new Types.ObjectId(dataSourceId),
        dataSourceVersionId: {
          $in: dataSourceVersionIdArray.map((id) => new Types.ObjectId(id)),
        },
        status: "active",
      };

      //const filters: Record<string, any> = dashboardFilters?.filters ?? {};
      const filters: Record<string, any> = {};
      let dueDaysFilterValue: string | null = null;

      const isDueDaysField = (key: string) => key === "Derived.dueDays";
      const statusFilter = dashboardFilters?.filters?.["Derived.Case Status"] ?? "Pending";
      const isCompleted = statusFilter === "Completed";
 // ---------------------------
// 1. Determine date grouping mode from groupBy using config file
// ---------------------------
let dateGroupingMode: string | null = null;

if (plotType) {
  const secondGroupBy = Array.isArray(plotType) ? plotType[0] : plotType;

  // dynamic valid plot types from config
  const validModes = plotTypesConfig.map(pt => pt.type.toLowerCase());

  if (typeof secondGroupBy === "string" && validModes.includes(secondGroupBy.toLowerCase())) {
    dateGroupingMode = secondGroupBy.toLowerCase();
  }
}

// ---------------------------
// 2. If date grouping mode exists, handle it separately
// ---------------------------
  const getDateGroupingModeCondition = async(field, value) => {
    if (value != null) {
      const raw = String(value);

      let startDate: Date | null = null;
      let endDate: Date | null = null;

      const config = getPlotTypeConfig(dateGroupingMode as any);

      // ----------------------------------
      // MONTHLY / WEEKLY / YEARLY / DAILY
      // ----------------------------------
      if (dateGroupingMode === "monthly") {
        const [yr, mon] = raw.split("-");
        startDate = new Date(Date.UTC(+yr, +mon - 1, 1));
        endDate = new Date(Date.UTC(+yr, +mon, 0));
      }
      else if (dateGroupingMode === "weekly") {
        const [from, to] = raw.split("~");
        startDate = new Date(Date.UTC(new Date(from).getUTCFullYear(), new Date(from).getUTCMonth(), new Date(from).getUTCDate()));
        endDate = new Date(Date.UTC(new Date(to).getUTCFullYear(),   new Date(to).getUTCMonth(),   new Date(to).getUTCDate()));
      }
      else if (dateGroupingMode === "yearly") {
        startDate = new Date(Date.UTC(+raw, 0, 1));
        endDate = new Date(Date.UTC(+raw, 11, 31));
      }
      else if (dateGroupingMode === "daily") {
        const d = new Date(raw);
        startDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        endDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      }

      // ----------------------------------
      // QUARTERS — Now using monthRange from config
      // ----------------------------------
      else if (dateGroupingMode === "quarterly" && config?.monthRange) {
        const [yearStr, quarterStr] = raw.split("-");
        const year = +yearStr;
        const quarterKey = quarterStr.toLowerCase() as keyof typeof config.monthRange;

        const range = config.monthRange[quarterKey];

        if (range) {
          const [startMonth, endMonth] = range;
          startDate = new Date(Date.UTC(year, startMonth, 1));
          endDate = new Date(Date.UTC(year, endMonth + 1, 0));
        }
      }

      if (startDate && endDate) {
        filters[field] = { $gte: startDate, $lte: endDate };
      }
    }
  }
  const isDateField = (field: string) =>
  dataSource.fieldSettings.some((f) => {
    const matchField =
      f.mappedAttributeName === field || f.label === field;

    return matchField && (f.type === "date" || f.type === "date-range");
  });
        
      //  Dimensions & groupBy logic kept intact
      if (dimensions && Array.isArray(dimensions)) {
        dimensions.forEach((dimension) => {
          if (dimension && typeof dimension === "object" && Object.keys(dimension).length > 0) {
            const [field, value] = Object.entries(dimension)[0];
            if (isDueDaysField(field)) {
              dueDaysFilterValue = value as string;
            } else if (dashBoardType === "trend") {
              query[`${field}`] = value;
            }else if(isDateField(field) && dateGroupingMode){
              getDateGroupingModeCondition(field, value);
            }else {
              filters[`${field}`] = value === "Unknown" ? { $in: [null, "", "Unknown"] } : value;
            }
          }
        });
      }
    

      if (groupBy && Array.isArray(groupBy)) {
        groupBy.forEach((group) => {
          if (group && typeof group === "object" && Object.keys(group).length > 0) {
            const [field, value] = Object.entries(group)[0];
            if (isDueDaysField(field)) {
              dueDaysFilterValue = value as string;
            }else if(isDateField(field) && dateGroupingMode){
              getDateGroupingModeCondition(field, value);
            } else {
              filters[`${field}`] = value === "Unknown" ? { $in: [null, "", "Unknown"] } : value;
            }
          }
        });
      }

      // -----------------------------
// NEW SORTING PRIORITY LOGIC
// -----------------------------
let effectiveSortBy = sort;

// Apply default sort ONLY if sort is not provided
if (!effectiveSortBy || Object.keys(effectiveSortBy).length === 0) {
  let sortField: string | null = null;

  // 1️ Try groupBy first
  if (Array.isArray(groupBy) && groupBy.length > 0) {
    sortField = getSortFieldFromArray(groupBy);
  }
  // 2️ Then try dimensions
  else if (Array.isArray(dimensions) && dimensions.length > 0) {
    sortField = getSortFieldFromArray(dimensions);
  }

  effectiveSortBy = sortField ? { [sortField]: 1 } : {};
}


    

      //  DueDays logic untouched
      if (dueDaysFilterValue && dueDaysFilterValue !== "Total Dues") {
        const now = new Date();
        const bucketMap: Record<string, [number, number]> = isCompleted
          ? {
              "0-1 Months": [0, 30],
              "2-3 Months": [31, 90],
              "4-6 Months": [91, 180],
              "7-12 Months": [181, 365],
            }
          : {
              "0-3 Days": [0, 3],
              "4-7 Days": [4, 7],
              "8-15 Days": [8, 15],
              "16-30 Days": [16, 30],
            };

        const range = bucketMap[dueDaysFilterValue];
        if (range) {
          const [startDays, endDays] = range;
          const dateField = isCompleted ? "DateTaken" : "DueDate";

          const startDate = new Date(now);
          startDate.setUTCDate(startDate.getUTCDate() + (isCompleted ? -endDays : startDays));
          startDate.setUTCHours(0, 0, 0, 0);

          const endDate = new Date(now);
          endDate.setUTCDate(endDate.getUTCDate() + (isCompleted ? -startDays : endDays));
          endDate.setUTCHours(0, 0, 0, 0);

          filters[`${dateField}`] = { $gte: startDate, $lte: endDate };
        }
      }

      dashboardFilters.chartFilters = filters;

      //  Original aggregation call preserved
      // const result =
      //   await defaultDataSourceVersionValue.getDataSourceVersionValueWidgetDataV2({
      //     schemaName,
      //     query,
      //     dashboardFilters,
      //     entityId: dataSource.entityId,
      //     aggregation: { type: "count", attributeName: "_id" },
      //     conditions,
      //     dashBoardType,
      //     dataSourceDetails: dataSource,
      //     isPaginate: true,
      //     page,
      //     limit,
      //   });

      // dataResults = result?.data ?? [];
      // pagination = result?.pagination || {};
      // --------------------------------------------------------------------
    // 2️ CREATE PAYLOAD FOR WORKER
    // --------------------------------------------------------------------

      const requestPayload = {
         schemaName,
          query,
          dashboardFilters,
          entityId: dataSource.entityId,
          aggregation: { type: aggregation?.type || "count", attributeName: aggregation.attributeName || "_id" },
          conditions,
          dashBoardType,
          dataSourceDetails: dataSource,
          isPaginate: true,
          page,
          limit,
          sort: effectiveSortBy,
      };

      // --------------------------------------------------------------------
      // 3️ SAVE DOWNLOAD REQUEST
      // --------------------------------------------------------------------
      const fileName = `${dataSource.name}_Export_Data_${formatDateTime(Date.now())}.xlsx`;
      const downloadRequest = await createDownloadRequest({
        organizationId,
        userId,
        status: "pending",
        fileName,
        requestPayload,
        dataSourceId
      });

      // --------------------------------------------------------------------
      // 4️ PUSH JOB INTO QUEUE
      // --------------------------------------------------------------------

      const downloadQueue = new Queue("downloadQueue", {
        connection: { host: "redis" },
      });

      await downloadQueue.add("exportWidgetData", { downloadRequestId: downloadRequest._id });

      res.status(200).json({
        success: true,
        message: "Export job queued successfully.",
        requestId: downloadRequest._id,
      });
    // } else {
    //   //  Full non-reference logic unchanged
    //   const getFieldType = (fieldName: string) => {
    //     const attribute = entity.attributes.find((attr: any) => attr.name === fieldName);
    //     return attribute ? attribute.type : "string";
    //   };

    //   const conditionsByField: Record<string, any[]> = {};
    //   conditions?.forEach((condition) => {
    //     if (!conditionsByField[condition.field]) {
    //       conditionsByField[condition.field] = [];
    //     }
    //     conditionsByField[condition.field].push(condition);
    //   });

    //   const initialMatchConditions = {
    //     dataSourceId: new Types.ObjectId(dataSourceId),
    //     dataSourceVersionId: { $in: dataSourceVersionIdArray },
    //   };

    //   if (dimensions && Array.isArray(dimensions)) {
    //     dimensions.forEach((dimension) => {
    //       const [field, value] = Object.entries(dimension)[0];
    //       if (dashBoardType === "trend") {
    //         initialMatchConditions[`${field}`] = value;
    //       } else {
    //         initialMatchConditions[`rowData.${field}`] = value;
    //       }
    //     });
    //   }

    //   if (groupBy && Array.isArray(groupBy)) {
    //     groupBy.forEach((group) => {
    //       const [field, value] = Object.entries(group)[0];
    //       initialMatchConditions[`rowData.${field}`] = value;
    //     });
    //   }

    //   const { matchConditions, dateConversions } = processFieldConditions(
    //     conditionsByField,
    //     getFieldType,
    //     initialMatchConditions
    //   );

    //   const detailPipeline: any[] = [];
    //   if (Object.keys(dateConversions).length > 0) {
    //     detailPipeline.push({ $addFields: dateConversions });
    //   }

    //   detailPipeline.push(
    //     { $match: matchConditions },
    //     { $project: { _id: 0, rowData: 1 } },
    //     { $replaceRoot: { newRoot: "$rowData" } }
    //   );

    //   const DataSourceModel = createDefaultDataSourceVersionModel(schemaName);
    //   dataResults = await DataSourceModel.aggregate(detailPipeline).exec();
    // }

    // //  Now just EXPORT the fetched data
    // const workbook = new ExcelJS.Workbook();
    // const worksheet = workbook.addWorksheet("Export Data");

    // const exportHeaders =
    //   Array.isArray(selectedFields) && selectedFields.length > 0
    //     ? selectedFields
    //     : headers;

    // worksheet.columns = exportHeaders.map((h) => ({
    //   header: h,
    //   key: h,
    //   width: 25,
    // }));

    // for (const record of dataResults) {
    //   const row: any = {};
    //   exportHeaders.forEach((key) => {
    //     row[key] = record[key] ?? "";
    //   });
    //   worksheet.addRow(row);
    // }

    // worksheet.getRow(1).font = { bold: true };
    // worksheet.getRow(1).alignment = { horizontal: "center" };

    // res.setHeader(
    //   "Content-Type",
    //   "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    // );
    // res.setHeader(
    //   "Content-Disposition",
    //   `attachment; filename=WidgetData_${dataSource.code}_${new Date()
    //     .toISOString()
    //     .split("T")[0]}.xlsx`
    // );

    // await workbook.xlsx.write(res);
    // res.end();
  } catch (err) {
    console.error("Error in exportWidgetDataByFilterToExcel:", err);
    next(err);
  }
};


