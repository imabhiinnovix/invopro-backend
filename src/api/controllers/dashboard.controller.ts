/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

import * as dashboardService from '../../database/services/dashboard.services';
import * as dashboardWidgetdService from '../../database/services/dashboardWidget.services';
import * as dataSourceVersionService from '../../database/services/dataSourceVersion.services';
import * as entityService from '../../database/services/entity.services';
import * as dataSourceService from '../../database/services/dataSource.services';

import { buildAggregationPipeline } from '../../utils/aggregationPipeline';
import { getSchemaNameBasedOnVersionCodeAndOrgCode } from '../../utils/common.utils';
import createDefaultDataSourceVersionModel from '../../database/models/defaultDataSourceVersionModel';
import { DataSourceVersion, Widget } from '../../types/widget.types';

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

    const data = await dashboardService.createDashboard({
      createdBy,
      organizationId,
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

    const data = await dashboardService.getDashboardById(dashboardId);

    res.status(200).json({ success: true, message: 'Data get successfully', data });
  } catch (err) {
    next(err);
  }
};

export const getDashboards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await dashboardService.getAllDashboards({
      query: {
        isDeleted: false,
        isActive: true,
      },
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
      position,
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
    const { orgCode } = req.user;

    const data: any = await dashboardService.getDashboardChartData({
      dashboardId: new mongoose.Types.ObjectId(dashboardId),
      orgCode,
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
    const { dataSourceId, entityId, dimensions, groupBy, aggregation, conditions } = req.body;
    const { orgCode } = req.user;

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
    })) as DataSourceVersion;

    if (!dataSourceVersion) {
      throw new Error('No active data source version found');
    }

    // 3. Build widget object for aggregation
    const widget: Widget = {
      dataSourceId: { _id: dataSourceId },
      dataSourceVersionId: dataSourceVersion._id,
      dimensions,
      groupBy,
      aggregation,
      entity, // Pass entity data for field type conversion
      conditions,
    };

    const aggregationPipeline = await buildAggregationPipeline(widget);

    // 4. Get schema name and create model
    const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: dataSource?.code,
    });
    const DataSourceModel = createDefaultDataSourceVersionModel(schemaName);

    // 5. Execute aggregation
    const dataResults = await DataSourceModel.aggregate(aggregationPipeline).exec();

    // 6. Prepare response
    const response = {
      success: true,
      message: 'Chart data fetched successfully',
      data: dataResults,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error('Error in getWidgetData:', err);
    next(err);
  }
};
