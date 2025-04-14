/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

import * as dashboardService from '../../database/services/dashboard.services';
import * as dashboardWidgetdService from '../../database/services/dashboardWidget.services';
import * as dataSourceVersionService from '../../database/services/dataSourceVersion.services';
import * as entityService from '../../database/services/entity.services';
import * as dataSourceService from '../../database/services/dataSource.services';
import * as widgetTypeService from '../../database/services/widgetType.service';
import * as widgetThemeService from '../../database/services/widgetTheme.service';
import * as widgetAppearanceService from '../../database/services/widgetAppearance.service';

import { buildAggregationPipeline } from '../../utils/aggregationPipeline';
import { getSchemaNameBasedOnVersionCodeAndOrgCode } from '../../utils/common.utils';
import createDefaultDataSourceVersionModel from '../../database/models/defaultDataSourceVersionModel';
import { DataSourceVersion } from '../../types/widget.types';

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

    if (!widgetTheme) throw new Error('Widget theme not fond');

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
    const { userId, organizationId } = req.user;

    const data = await dashboardService.getAllDashboardsAggregation({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    res.status(200).json({ success: true, message: 'Dashboard get successfully', ...data });
  } catch (err) {
    next(err);
  }
};

export const updateDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId: createdBy } = req.user;
    const { name, description, isActive } = req.body;

    await dashboardService.getDashboardById(req.params.dashboardId);

    const update: any = {
      ...(name && { name }),
      ...(description && { description }),
    };

    if (isActive != null || isActive != undefined) {
      update.isActive = isActive;
    }

    const dashboardExist = await dashboardService.getDashboard({
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
    const { dashboardId, widgetTypeId, name, dimensions, groupBy, conditions, aggregation, dataSourceId, position } =
      req.body;

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
      dimensions,
      groupBy: groupBy ? groupBy : [],
      conditions,
      aggregation,
      dataSourceId,
      position: {
        ...position,
        index: nextIndex,
      },
    });

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
    const { name, dimensions, groupBy, conditions, aggregation, dataSourceId, position } = req.body;
    const { dashboardWidgetId } = req.params;

    await dashboardWidgetdService.updateDashboardWidget(dashboardWidgetId, {
      ...(name && { name }),
      ...(dataSourceId && { dataSourceId }),
      ...(aggregation && { aggregation }),
      ...(dimensions && { dimensions }),
      ...(groupBy && { groupBy }),
      ...(conditions.length > 0 && { conditions }),
      ...(position && { position }),
    });

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
    await dashboardService.updateDashboard(req.params.dashboardId, {
      isDeleted: true,
    });

    res.status(200).json({ success: true, message: 'Dashboard deleted successfully' });
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

export const getWidgetData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dataSourceId, entityId, aggregation, groupBy, conditions, widgetType, widgetAppearanceId } = req.body;
    const { orgCode, organizationId } = req.user;

    let dimensions = req.body.dimensions;

    const widgetTypeData = await widgetTypeService.getWidgetType({ chartType: widgetType });

    if (!widgetTypeData) {
      throw new Error('Widget type not found');
    }

    if (widgetTypeData.chartType === 'number') {
      dimensions = [aggregation.attributeName];
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

    // 3. Build widget object for aggregation
    const widget: any = {
      dataSourceId: dataSourceId.toString(),
      dataSourceVersionId: dataSourceVersion._id.toString(),
      dimensions,
      groupBy,
      aggregation,
      entity, // Pass entity data for field type conversion
      conditions,
      widgetType,
    };

    const aggregationPipeline = buildAggregationPipeline(widget);

    // 4. Get schema name and create model
    const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: dataSource?.code,
    });
    const DataSourceModel = createDefaultDataSourceVersionModel(schemaName);

    // 5. Execute aggregation
    const dataResults = await DataSourceModel.aggregate(aggregationPipeline).exec();

    let widgetAppearance: any = {};
    if (widgetAppearanceId) {
      widgetAppearance = await widgetAppearanceService.getWidgetAppearance({ _id: widgetAppearanceId, organizationId });
    }

    // 6. Prepare response
    const response = {
      success: true,
      message: 'Chart data fetched successfully',
      data: dataResults,
      widgetAppearance,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error('Error in getWidgetData:', err);
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

    await Promise.all(
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

    res.status(200).json({
      success: true,
      message: 'Widgets created successfully',
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
