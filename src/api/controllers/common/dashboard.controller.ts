/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';

import * as dashboardService from '../../../database/services/common/dashboard.services';
import * as dashboardWidgetdService from '../../../database/services/common/dashboardWidget.services';
import * as dataSourceVersionService from '../../../database/services/common/dataSourceVersion.services';
import * as entityService from '../../../database/services/common/entity.services';
import * as dataSourceService from '../../../database/services/common/dataSource.services';
import * as widgetTypeService from '../../../database/services/common/widgetType.service';
import * as widgetThemeService from '../../../database/services/common/widgetTheme.service';
// import * as widgetAppearanceService from '../../database/services/widgetAppearance.service';

import { buildAggregationPipeline } from '../../../utils/aggregationPipeline';
import { checkReferenceFieldExist, getSchemaNameBasedOnVersionCodeAndOrgCode } from '../../../utils/common.utils';
import createDefaultDataSourceVersionModel from '../../../database/models/common/defaultDataSourceVersionModel';
import { DataSourceVersion } from '../../../types/widget.types';
import { DateTime } from 'luxon';
import { getDataSourceVersionValueV2 } from '../../../database/services/common/defaultDataSourceVersionValue.services';
import { getDataSourceById } from './dataSource.controller';
import { getUserDataPermissionRecord } from '../../../database/services/common/userDataPermission.service';
import { plotTypesConfig } from "../../../config/plotType.config";
import { removeDashboardFromRoleDefaults } from '../../../database/services/common/roleDefaultDashboard.service';
import { Queue } from "bullmq";

export const createDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    const { userId: createdBy, organizationId } = req.user;

    const dashboardExist = await dashboardService.getDashboard({
      name,
      createdBy,
      isDeleted: false,
    });

    if (dashboardExist) throw new Error('Duplicate Dashboard found. Please remove or modify the entry.');

    const widgetTheme = await widgetThemeService.findWidgetTheme({
      isDefault: true,
      organizationId,
    });

    if (!widgetTheme) throw new Error('Widget theme not found');

    const data = await dashboardService.createDashboard({
      createdBy,
      organizationId,
      widgetThemeId: widgetTheme?._id,
      ...req.body,
    });

    res.status(201).json({ success: true, message: 'Dashboard created successfully', data });
  } catch (err) {
    next(err);
  }
};

export const getDashboardById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dashboardId } = req.params;
    const { organizationId } = req.user;

    const data = await dashboardService.getDashboard({
      _id: dashboardId,
      organizationId,
    });

    res.status(200).json({ success: true, message: 'Data get successfully', data });
  } catch (err) {
    next(err);
  }
};

export const getDashboards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId, roleIds } = req.user;

    const data = await dashboardService.getAllDashboardsAggregation({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      userId: new mongoose.Types.ObjectId(userId),
      roleIds: roleIds.map(id => new mongoose.Types.ObjectId(id)),
    });

    res.status(200).json({ success: true, message: 'Dashboard get successfully', ...data });
  } catch (err) {
    next(err);
  }
};

export const getDashboardNameList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, organizationId } = req.user;

    const { data } = await dashboardService.getAllDashboards({
      query: {
        createdBy: userId,
        organizationId,
        isActive: true,
        isDeleted: false,
      },
      select: '_id name',
      paginate: false,
      page: 0,
      limit: 0,
      sort: { name: 1 },
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};


export const updateDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId: createdBy } = req.user;
    const { name, description, isActive, startVersionValue, endVersionValue, dynamicVersionValue, versionValue } =
      req.body;

    const dashboardDetails = await dashboardService.getDashboardById(req.params.dashboardId);

    let update: any = {
      ...(name && { name }),
      ...(description && { description }),
    };

    if (!!dynamicVersionValue) {
      update = {
        $set: {
          ...(name && { name }),
          ...(description && { description }),
          ...(dynamicVersionValue && { 'settings.dynamicVersionValue': dynamicVersionValue }),
          'settings.startVersionValue': '',
          'settings.endVersionValue': '',
        },
      };
    }

    if (dashboardDetails.settings.dashboardType === 'trend') {
      if (!dynamicVersionValue && !!startVersionValue && !!endVersionValue) {
        update = {
          $set: {
            ...(name && { name }),
            ...(description && { description }),
            'settings.dynamicVersionValue': '',
            'settings.startVersionValue': startVersionValue,
            'settings.endVersionValue': endVersionValue,
          },
        };
      }
    } else {
      if (!dynamicVersionValue && !!versionValue) {
        update = {
          $set: {
            ...(name && { name }),
            ...(description && { description }),
            'settings.dynamicVersionValue': '',
            'settings.versionValue': versionValue,
          },
        };
      }
    }

    if (isActive != null || isActive != undefined) {
      update.isActive = isActive;
    }

    const dashboardExist = await dashboardService.getDashboard({
      _id: {$ne : req.params.dashboardId},
      name,
      createdBy,
      isDeleted: false,
    });

    if (dashboardExist) throw new Error('Duplicate Dashboard found. Please remove or modify the entry.');

    const updatedData = await dashboardService.updateDashboardById(req.params.dashboardId, update);
    res.status(200).json({
      success: true,
      message: 'Dashboard updated successfully',
      data: updatedData,
    });
  } catch (err) {
    next(err);
  }
};

export const createWidget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      dashboardId,
      widgetTypeId,
      name,
      dimensions,
      groupBy,
      plotType,
      conditions,
      aggregation,
      dataSourceId,
      position,
      isIncremental,
      description
    } = req.body;

    const { organizationId, userId } = req.user;

    // Check for duplicate widget name in the same dashboard
    const existingWidget = await dashboardWidgetdService.getDashboardWidget(
      {
        dashboardId,
        name,
        isActive: true,
      },
      []
    );

    if (existingWidget) {
      throw new Error('A widget with this name already exists in this dashboard. Please use a different name.');
    }

    // Get the current highest index for this dashboard
    const lastWidget = await dashboardWidgetdService.getLastWidgetIndex(dashboardId);
    const nextIndex = (lastWidget?.position?.index || 0) + 1;

    const dashboardWidget = await dashboardWidgetdService.createDashboardWidget({
      dashboardId,
      widgetTypeId,
      organizationId,
      createdBy: userId,
      name,
      description,
      dimensions,
      groupBy: groupBy ? groupBy : [],
      plotType: plotType ? plotType : [],
      conditions,
      aggregation,
      dataSourceId,
      isIncremental: isIncremental ? isIncremental : false,
      position: {
        ...position,
        index: nextIndex,
      },
    });

    if(!description){
      // Create BullMQ connection (same name as worker uses)
      const aiDataQueue = new Queue("aiDataQueue", {
        connection: {
          host: "redis", // or your Redis host
        },
      });

      // Add job to queue — worker will handle the actual sending
      await aiDataQueue.add("generateWidgetSummary", { widgetId: dashboardWidget._id });
    }
    res.status(200).json({
      success: true,
      message: 'Widget created successfully',
      data: dashboardWidget,
    });
  } catch (err) {
    next(err);
  }
};

export const updateWidget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      dimensions,
      entityId,
      widgetTypeId,
      groupBy,
      plotType,
      conditions,
      aggregation,
      dataSourceId,
      position,
      isActive,
      isDeleted,
      isIncremental,
      description,
      dashboardId
    } = req.body;
    const { dashboardWidgetId } = req.params;

    // 0️ Duplicate name check (only if name is being changed)
    if (name) {
      const existingWidget = await dashboardWidgetdService.getDashboardWidget(
        {
          dashboardId,
          name,
          isActive: true,
          _id: { $ne: dashboardWidgetId },
        },
        []
      );

      if (existingWidget) {
        return res.status(400).json({
          success: false,
          message: 'A widget with this name already exists in this dashboard. Please use a different name.',
        });
      }
    }

    // await dashboardWidgetdService.updateDashboardWidget(dashboardWidgetId, {
    //   ...(name && { name }),
    //   ...(description && { description }),
    //   ...(dataSourceId && { dataSourceId }),
    //   ...(aggregation && { aggregation }),
    //   ...(dimensions && { dimensions }),
    //   ...(groupBy && { groupBy }),
    //   ...(plotType && { plotType }),
    //   ...(conditions && { conditions }),
    //   ...(position && { position }),
    //   ...(widgetTypeId && { widgetTypeId }),
    //   ...(entityId && { entityId }),
    //   ...(typeof isActive !== 'undefined' && { isActive }),
    //   ...(typeof isDeleted !== 'undefined' && { isDeleted }),
    //   ...(typeof isIncremental !== 'undefined' && { isIncremental }),
    // });

    await dashboardWidgetdService.updateDashboardWidget(dashboardWidgetId, {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }), // allow blank string
      ...(dataSourceId !== undefined && { dataSourceId }),
      ...(aggregation !== undefined && { aggregation }),
      ...(dimensions !== undefined && { dimensions }),
      ...(groupBy !== undefined && { groupBy }),
      ...(plotType !== undefined && { plotType }),
      ...(conditions !== undefined && { conditions }),
      ...(position !== undefined && { position }),
      ...(widgetTypeId !== undefined && { widgetTypeId }),
      ...(entityId !== undefined && { entityId }),
      ...(typeof isActive !== 'undefined' && { isActive }),
      ...(typeof isDeleted !== 'undefined' && { isDeleted }),
      ...(typeof isIncremental !== 'undefined' && { isIncremental }),
    });


    if(!description){
      // Create BullMQ connection (same name as worker uses)
      const aiDataQueue = new Queue("aiDataQueue", {
        connection: {
          host: "redis", // or your Redis host
        },
      });

      // Add job to queue — worker will handle the actual sending
      await aiDataQueue.add("generateWidgetSummary", { widgetId: dashboardWidgetId });
    }

    res.status(200).json({
      success: true,
      message: 'Widget updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const deleteDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dashboardId = req.params.dashboardId;

    const { userId } = req.user;

    // Fetch dashboard to get old name
    const dashboard = await dashboardService.getDashboardById(dashboardId);

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        message: "Dashboard not found",
      });
    }

    // Rename deleted dashboard to prevent unique name conflict
    const newName = `${dashboard.name}__deleted__${Date.now()}`;

    await dashboardService.updateDashboard(dashboardId, {
      isDeleted: true,
      isActive: false,
      name: newName,
    });

    // REMOVE FROM ROLE DEFAULT DASHBOARD
    await removeDashboardFromRoleDefaults(
      new Types.ObjectId(dashboardId),
      userId
    );

    res.status(200).json({
      success: true,
      message: "Dashboard deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};


export const getDashboardWidgetList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dashboardId } = req.params;
    const { organizationId } = req.user;

    const data: any = await dashboardService.getDashboardChartData({
      dashboardId: new mongoose.Types.ObjectId(dashboardId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
    });

    res.status(200).json({
      success: true,
      message: 'Chart data fetched successfully',
      ...data,
    });
  } catch (err) {
    next(err);
  }
};

type DataItem = {
  name: string; // e.g., "2025-02"
  data: number;
  [key: string]: any;
};

function calculateMoMDifference<T extends DataItem>(data: T[], groupBy: string[]): DataItem[] {
  const grouped: Record<string, T[]> = {};

  // Group by dynamic fields
  for (const item of data) {
    const key = groupBy.map((field) => item[field]).join('||');
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  const result: DataItem[] = [];

  // Process each group
  for (const records of Object.values(grouped)) {
    // Sort by date string (assumes format: YYYY-MM)
    records.sort((a, b) => a.name.localeCompare(b.name));

    for (let i = 0; i < records.length; i++) {
      const current = records[i];
      const prev = i > 0 ? records[i - 1] : null;

      const currentYear = current.name.split('-')[0];
      const prevYear = prev?.name.split('-')[0];

      const difference = prev && currentYear === prevYear ? current.data - prev.data : current.data;

      result.push({
        ...current,
        data: difference,
      });
    }
  }

  return result;
}

export const getWidgetChartData = async ({
  dataSourceId,
  dimensions,
  entityId,
  aggregation,
  groupBy,
  conditions,
  widgetType,
  orgCode,
  dashBoardType,
  dashboardFilters,
  isIncremental,
}: {
  dataSourceId: string;
  dimensions: any;
  entityId: string;
  aggregation: any;
  groupBy: any;
  conditions: any;
  widgetType: string;
  orgCode: string;
  dashBoardType?: string;
  dashboardFilters?: any;
  isIncremental?: boolean;
}) => {
  let startVersionValue = dashboardFilters?.startVersionValue;
  let endVersionValue = dashboardFilters?.endVersionValue;
  let dynamicVersionValue = dashboardFilters?.dynamicVersionValue;
  let versionValue = dashboardFilters?.versionValue;

  if (dashBoardType === 'normal') {
    if (versionValue && !dynamicVersionValue) {
      const formattedVersionValue = DateTime.fromISO(versionValue).toFormat('yyyy-MM');
      startVersionValue = formattedVersionValue;
      endVersionValue = formattedVersionValue;
    } else {
      startVersionValue = '';
      endVersionValue = '';
    }
  }

  if (dashBoardType === 'trend' && !!dynamicVersionValue) {
    endVersionValue = DateTime.now().toFormat('yyyy-MM');

    if (dynamicVersionValue === '3m') {
      startVersionValue = DateTime.now().minus({ months: 3 }).toFormat('yyyy-MM');
    } else if (dynamicVersionValue === '6m') {
      startVersionValue = DateTime.now().minus({ months: 6 }).toFormat('yyyy-MM');
    } else if (dynamicVersionValue === '12m') {
      startVersionValue = DateTime.now().minus({ months: 12 }).toFormat('yyyy-MM');
    } else {
      startVersionValue = DateTime.now().minus({ months: 1 }).toFormat('yyyy-MM');
    }
  }

  let labelVersionValue = '';
  // let dimensions = req.body.dimensions;

  const widgetTypeData = await widgetTypeService.getWidgetType({ chartType: widgetType });

  if (!widgetTypeData) {
    throw new Error('Widget type not found');
  }

  // 1. Fetch entity data for field type information
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
    labelVersionValue = startVersionValue;
  } else {
    dataSourceVersion = (await dataSourceVersionService.getDataSourceVersion({
      query: {
        dataSourceId: dataSourceId,
        isCurrent: true,
        isActive: true,
      },
      sort: { versionValue: -1 },
    })) as DataSourceVersion;
    if (dataSourceVersion) {
      labelVersionValue = dataSourceVersion?.versionValue;
      dataSourceVersion = [dataSourceVersion];
    }
  }

  if (!dataSourceVersion || dataSourceVersion.length === 0) {
    // throw new Error('No active data source version found');

    return {
      label: dashBoardType === 'trend' ? `${startVersionValue}:${endVersionValue}` : labelVersionValue,
      widgetData: [],
    };
  }

  const dataSourceVersionIdArray = dataSourceVersion.map((data) => new Types.ObjectId(data._id.toString()));
  // 3. Build widget object for aggregation
  const widget: any = {
    dataSourceId: dataSourceId.toString(),
    dataSourceVersionIdArray: dataSourceVersionIdArray,
    dimensions,
    groupBy,
    dashBoardType,
    aggregation,
    entity, // Pass entity data for field type conversion
    conditions,
    widgetType,
  };

  const aggregationPipeline = buildAggregationPipeline(widget);

  console.log('\nFinal Aggregation Pipeline:', JSON.stringify(aggregationPipeline, null, 2));

  // 4. Get schema name and create model
  const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
    orgCode,
    versionCode: dataSource?.code,
  });
  const DataSourceModel = createDefaultDataSourceVersionModel(schemaName);

  // 5. Execute aggregation
  const dataResultsWithTotalArray = await DataSourceModel.aggregate(aggregationPipeline).exec();

  const dataResultsWithTotalMap =
    dataResultsWithTotalArray && dataResultsWithTotalArray.length > 0 ? dataResultsWithTotalArray[0] : {};

  // get the widget Appearance
  // let widgetAppearance: any = {};
  // if (widgetAppearanceId) {
  //   widgetAppearance = await widgetAppearanceService.getWidgetAppearance({ _id: widgetAppearanceId, organizationId });
  // }

  let dataResults = dataResultsWithTotalMap?.data ? dataResultsWithTotalMap?.data : [];
  if (isIncremental) {
    if (groupBy && groupBy.length >= 0) {
      dataResults = calculateMoMDifference(dataResults, groupBy);
    } else {
      dataResults = dataResults.map((entry, index, array) => {
        if (index === 0) {
          return { ...entry }; // First entry, no difference
        }

        const currentYear = entry.name.split('-')[0];
        const prevEntry = array[index - 1];
        const prevYear = prevEntry.name.split('-')[0];

        if (currentYear === prevYear) {
          return {
            ...entry,
            data: entry.data - prevEntry.data,
          };
        } else {
          return { ...entry }; // New year, no subtraction
        }
      });
    }
  }

  if (dashBoardType === 'trend') {
    dataResults = dataResults.sort((x, y) => x.name.localeCompare(y.name));
  }
  return {
    label: dashBoardType === 'trend' ? `${startVersionValue}:${endVersionValue}` : labelVersionValue,
    widgetData: dataResults,
    totalCount: dataResultsWithTotalMap?.total ? dataResultsWithTotalMap?.total : 0,
  };
};

export const getNewChartData = async ({
          dataSourceId,
          dimensions,
          entityId,
          aggregation,
          groupBy,
          conditions,
          widgetType,
          dashBoardType,
          dashboardFilters,
          isIncremental,
          orgCode,
          dataSourceDetails,
          plotType
        }) => {
  try {
    // const { dataSourceId, filters, versionValue, dimensions, groupBy, aggregation, conditions, widgetType } = req.body;

    // const { orgCode } = req.user;

    // const dataSourceDetails = await dataSourceService.findDataSourceById(dataSourceId, true);
    // if (!dataSourceDetails) {
    //   return res.status(404).json({ success: false, message: 'Data source not found.' });
    // }


  let startVersionValue = dashboardFilters?.startVersionValue;
  let endVersionValue = dashboardFilters?.endVersionValue;
  let dynamicVersionValue = dashboardFilters?.dynamicVersionValue;
  let versionValue = dashboardFilters?.versionValue;

  if (dashBoardType === 'normal') {
    if (versionValue && !dynamicVersionValue) {
      const formattedVersionValue = DateTime.fromISO(versionValue).toFormat('yyyy-MM');
      startVersionValue = formattedVersionValue;
      endVersionValue = formattedVersionValue;
    } else {
      startVersionValue = '';
      endVersionValue = '';
    }
  }

  if (dashBoardType === 'trend' && !!dynamicVersionValue) {
    endVersionValue = DateTime.now().toFormat('yyyy-MM');

    if (dynamicVersionValue === '3m') {
      startVersionValue = DateTime.now().minus({ months: 3 }).toFormat('yyyy-MM');
    } else if (dynamicVersionValue === '6m') {
      startVersionValue = DateTime.now().minus({ months: 6 }).toFormat('yyyy-MM');
    } else if (dynamicVersionValue === '12m') {
      startVersionValue = DateTime.now().minus({ months: 12 }).toFormat('yyyy-MM');
    } else {
      startVersionValue = DateTime.now().minus({ months: 1 }).toFormat('yyyy-MM');
    }
  }

  let labelVersionValue = '';
  // let dimensions = req.body.dimensions;

  const widgetTypeData = await widgetTypeService.getWidgetType({ chartType: widgetType });

  if (!widgetTypeData) {
    throw new Error('Widget type not found');
  }

  // 1. Fetch entity data for field type information
  const entity: any = await entityService.getEntity({
    _id: entityId,
  });

  if (!entity) {
    throw new Error('Entity not found');
  }

  // 2. Fetch current active data source version
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
    labelVersionValue = startVersionValue;
  } else {
    dataSourceVersion = (await dataSourceVersionService.getDataSourceVersion({
      query: {
        dataSourceId: dataSourceId,
        isCurrent: true,
        isActive: true,
      },
      sort: { versionValue: -1 },
    })) as DataSourceVersion;
    if (dataSourceVersion) {
      labelVersionValue = dataSourceVersion?.versionValue;
      dataSourceVersion = [dataSourceVersion];
    }
  }

  if (!dataSourceVersion || dataSourceVersion.length === 0) {
    // throw new Error('No active data source version found');

    return {
      label: dashBoardType === 'trend' ? `${startVersionValue}:${endVersionValue}` : labelVersionValue,
      widgetData: [],
    };
  }

  const dataSourceVersionIdArray = dataSourceVersion.map((data) => new Types.ObjectId(data._id.toString()));

    const versionQuery: any = {
      dataSourceId: new Types.ObjectId(dataSourceId),
      isCurrent: true, // Always filter for current version
    };

    // if (versionValue) {
    //   versionQuery.versionValue = versionValue; // Optional, narrows to specific version if provided
    // }

    const dataSourceVersionDetails = await dataSourceVersionService.getDataSourceVersionList({
      query: versionQuery,
    });

    if (!dataSourceVersionDetails?.data?.length) {
      return [];
    }

    const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: dataSourceDetails.code,
    });

    const query = { 
              dataSourceId: new Types.ObjectId(dataSourceId),
              dataSourceVersionId: { $in: dataSourceVersionIdArray }, 
              status: 'active' 
            };

    const result = await getDataSourceVersionValueV2({
      schemaName,
      query,
      dashboardFilters,
      entityId: dataSourceDetails.entityId,
      dimension: dimensions,
      groupBy,
      aggregation,
      conditions,
      widgetType,
      dashBoardType,
      dataSourceDetails,
      plotType
    });
    let dataResults = result?.widgetData ?? [];

    if (isIncremental) {
      if (groupBy && groupBy.length >= 0) {
        dataResults = calculateMoMDifference(dataResults, groupBy);
      } else {
        dataResults = dataResults.map((entry, index, array) => {
          if (index === 0) {
            return { ...entry }; // First entry, no difference
          }

          const currentYear = entry.name.split('-')[0];
          const prevEntry = array[index - 1];
          const prevYear = prevEntry.name.split('-')[0];

          if (currentYear === prevYear) {
            return {
              ...entry,
              data: entry.data - prevEntry.data,
            };
          } else {
            return { ...entry }; // New year, no subtraction
          }
        });
      }
    }
    if (dashBoardType === 'trend') {
      dataResults = dataResults.sort((x, y) => x.name.localeCompare(y.name));
    }
    return {
      label: dashBoardType === 'trend' ? `${startVersionValue}:${endVersionValue}` : labelVersionValue,
      widgetData: dataResults,
      totalCount: result?.totalCount ? result?.totalCount : 0,
    };
  } catch (e) {
    console.log('Error in getNotivixChartData:', e);
  }
};

export const getWidgetData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let {
      dataSourceId,
      dimensions,
      entityId,
      aggregation,
      groupBy,
      conditions,
      widgetType,
      dashBoardType,
      dashboardFilters,
      isIncremental,
      plotType
    } = req.body;
    const { orgCode, userId, organizationId } = req.user;


    const dataSourceDetails: any= await dataSourceService.findDataSourceById(dataSourceId);
    let result: any;


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

      // Step 1: Start with payload conditions
      for (const cond of conditions || []) {
        mergedMap.set(cond.field, cond);
      }

      // Step 2: Overwrite or add user permission conditions
      for (const [field, cond] of userConditionsMap.entries()) {
        mergedMap.set(field, cond);
      }

      // Step 3: Convert back to array
      conditions = Array.from(mergedMap.values());
    }

    // console.log('conditions',JSON.stringify(conditions));
    // Normalize dimension and groupBy: remove "Derived." prefix from all fields
    dimensions = dimensions.map((d) => d.replace(/^Derived\./, ""));
    groupBy = groupBy.map((g) => g.replace(/^Derived\./, ""));

    const isDefaultForce = true;

    const isReferenceField = await checkReferenceFieldExist(dataSourceDetails);
    if(isReferenceField == true || isDefaultForce == true){
        result = await getNewChartData({
          dataSourceId,
          dimensions,
          entityId,
          aggregation,
          groupBy,
          conditions,
          widgetType,
          dashBoardType,
          dashboardFilters,
          isIncremental,
          orgCode,
          dataSourceDetails,
          plotType
        });
    }else{
        result = await getWidgetChartData({
        dataSourceId,
        dimensions,
        entityId,
        aggregation,
        groupBy,
        conditions,
        widgetType,
        orgCode,
        dashBoardType,
        dashboardFilters,
        isIncremental,
      });
    }

    if (result?.widgetData && result?.widgetData?.length > 500) {
      res.status(400).json({
        success: false,
        message: 'Chart data is very large please change the dimensions.',
        errors: [{ fieldName: 'Dimension', message: 'Data is very large please choose another dimension.' }],
      });
    }
    const response = {
      success: true,
      message: 'Chart data fetched successfully',
      data: result,
    };
    res.status(200).json(response);
  } catch (err) {
    console.error('Error in getWidgetData:', err);
    next(err);
  }
};

export const getImageWidgetData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { widgetId } = req.params;
    const { organizationId } = req.user;

    const widget = await dashboardWidgetdService.getDashboardWidget({
      _id: widgetId,
      organizationId,
      widgetKind: 'image',
      isActive: true,
      isDeleted: false,
    });

    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Image widget not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Image widget fetched successfully',
      data: widget,
    });
  } catch (err) {
    next(err);
  }
};


export const saveDashboardWidgets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { widgets } = req.body;
    const { organizationId, userId } = req.user;

    if (!Array.isArray(widgets)) {
      throw new Error('Widgets must be an array');
    }

    // Check for duplicate widget names within the input array
    const widgetNames = widgets.map((widget) => widget.name);
    const uniqueWidgetNames = new Set(widgetNames);
    if (widgetNames.length !== uniqueWidgetNames.size) {
      throw new Error('Duplicate widget names found in the input. Each widget must have a unique name.');
    }

    // Check for existing widgets with same names in the dashboard
    const dashboardId = widgets[0].dashboardId;
    const existingWidgets = await dashboardWidgetdService.getAllDashboardWidgets({
      query: {
        dashboardId,
        name: { $in: widgetNames },
        isActive: true,
      },
    });

    if (existingWidgets.data.length > 0) {
      throw new Error('Some widget names already exist in this dashboard. Please use different names.');
    }

    // Get the current highest index for this dashboard
    const lastWidget = await dashboardWidgetdService.getLastWidgetIndex(dashboardId);
    let nextIndex = (lastWidget?.position?.index || 0) + 1;

    const createdWidgets = await Promise.all(
      widgets.map(async (widget) => {
        const widgetWithIndex = {
          ...widget,
          organizationId,
          createdBy: userId,
          isActive: true,
          position: {
            ...widget.position,
            index: nextIndex++,
          },
        };
        return await dashboardWidgetdService.createDashboardWidget(widgetWithIndex);
      })
    );

    // ---------------------------
    // AI SUMMARY QUEUE (FIXED)
    // ---------------------------
    const widgetsNeedingSummary = createdWidgets.filter(
      (w: any) => !w.description
    );

    if (widgetsNeedingSummary.length > 0) {
      const aiDataQueue = new Queue("aiDataQueue", {
        connection: {
          host: "redis",
        },
      });

      await Promise.all(
        widgetsNeedingSummary.map((widget: any) =>
          aiDataQueue.add("generateWidgetSummary", {
            widgetId: widget._id,
          })
        )
      );
    }

    res.status(200).json({
      success: true,
      message: 'Widgets created successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const createImageWidget = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { dashboardId, name, description } = req.body;
    const { organizationId, userId } = req.user;
    const file = req.file as Express.Multer.File;

    if (!dashboardId || !name) {
      return res.status(400).json({
        success: false,
        message: 'dashboardId, name are required',
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Image file is required',
      });
    }

    // Duplicate name check
    const existingWidget = await dashboardWidgetdService.getDashboardWidget(
      {
        dashboardId,
        name,
        isActive: true,
        isDeleted: false,
      },
      []
    );

    if (existingWidget) {
      return res.status(400).json({
        success: false,
        message: 'Widget name already exists in this dashboard',
      });
    }

    // Get next index
    const lastWidget = await dashboardWidgetdService.getLastWidgetIndex(dashboardId);
    const nextIndex = (lastWidget?.position?.index || 0) + 1;

    // Handle logo upload
    let imagePath = '';
    if (file) {
      // Assuming first uploaded file is the logo
      imagePath = `${process.env.BASE_BACKEND_URL}/${file.path.replace(/\\/g, '/')}`;
    }

    const widget = await dashboardWidgetdService.createDashboardWidget({
      createdBy: userId,
      organizationId,
      dashboardId,
      widgetKind: 'image',

      name,
      description,

      position: {
        x: 0,
        y: 0,
        index: nextIndex,
      },

      image: imagePath,

      // Flags
      isActive: true,
      isDeleted: false,
      isIncremental: false,
    });

    res.status(201).json({
      success: true,
      message: 'Image widget created successfully',
      data: widget,
    });
  } catch (err) {
    next(err);
  }
};


export const deleteWidget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dashboardWidgetId } = req.params;

    await dashboardWidgetdService.updateDashboardWidget(dashboardWidgetId, {
      isDeleted: true,
      isActive: false
    });

    res.status(200).json({ success: true, message: 'Widget deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const selectDashboardTheme = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dashboardId } = req.params;
    const { widgetThemeId } = req.body;
    const { organizationId } = req.user;

    // Validate the themeId
    const widgetTheme = await widgetThemeService.findWidgetTheme({
      _id: widgetThemeId,
      organizationId,
    });

    if (!widgetTheme) {
      throw new Error('Invalid theme selected.');
    }

    // Update the widget with the selected theme
    await dashboardService.updateDashboardById(dashboardId, {
      widgetThemeId,
    });

    res.status(200).json({
      success: true,
      message: 'Widget theme selected successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getPlotTypes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    res.status(200).json({
      success: true,
      message: "Plot Types Fetched Successfully",
      data: plotTypesConfig,
    });
  } catch (err) {
    next(err);
  }
};
