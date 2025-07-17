/* eslint-disable @typescript-eslint/no-explicit-any */
import { Settings } from 'luxon';
import { buildAggregationPipeline } from '../../../utils/aggregationPipeline';
import { getSchemaNameBasedOnVersionCodeAndOrgCode } from '../../../utils/common.utils';
import Dashboard from '../../models/reportivix/dashboard';
import DashboardWidget from '../../models/reportivix/dashboardWidget';
import createDefaultDataSourceVersionModel from '../../models/reportivix/defaultDataSourceVersionModel';

import * as DashboardWidgetService from '../services/dashboardWidget.services';

export const createDashboard = async (dashboardData: any) => {
  try {
    const dashboard = new Dashboard(dashboardData);
    await dashboard.save();
    return dashboard;
  } catch (err) {
    throw err;
  }
};

export const getDashboard = async (query: any) => {
  try {
    const dashboard = await Dashboard.findOne(query);
    return dashboard;
  } catch (err) {
    throw err;
  }
};

export const getAllDashboards = async ({
  query,
  select = '',
  page,
  limit,
  sort = { createdAt: -1 },
  populate,
}: any) => {
  try {
    let dashboardsQuery = Dashboard.find(query)
      .select(select)
      .skip(page * limit)
      .limit(limit)
      .sort(sort);

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        dashboardsQuery = dashboardsQuery.populate(field);
      });
    }

    const dashboards = await dashboardsQuery.exec();

    const totalCount = await Dashboard.countDocuments(query);

    // return widget;
    return { data: dashboards, totalCount };
  } catch (err) {
    throw err;
  }
};

export const getDashboardById = async (id: string) => {
  try {
    const data = await Dashboard.findById(id);
    if (!data) {
      throw new Error('Data not found');
    }
    return data;
  } catch (err) {
    throw err;
  }
};
export const updateDashboard = async (id: string, dashboardData: any) => {
  try {
    const dashboard = await Dashboard.findByIdAndUpdate(id, dashboardData, { new: true });
    return dashboard;
  } catch (err) {
    throw err;
  }
};

export const updateDashboardById = async (dashboardId: string, dashboardData: any) => {
  try {
    const dashboard = await Dashboard.findByIdAndUpdate(dashboardId, dashboardData, { new: true });
    return dashboard;
  } catch (error) {
    throw error;
  }
};

export const deleteDashboard = async (id: string) => {
  try {
    await Dashboard.findByIdAndDelete(id);
  } catch (err) {
    throw err;
  }
};

export const getDashboardChartData = async (payload: any) => {
  try {
    const { dashboardId, organizationId } = payload;

    const dashboardWidgets = await DashboardWidgetService.getAllDashboardWidgets({
      query: { dashboardId, organizationId, isDeleted: false },
      populate: ['widgetTypeId', 'dataSourceId'],
    });

    return dashboardWidgets;
  } catch (err) {
    throw err;
  }
};

export const getAllDashboardsAggregation = async ({
  organizationId,
  userId,
  page,
  limit,
  sort = { createdAt: -1 },
}: any) => {
  try {
    const pipeline: any[] = [
      // Match by org, active, not deleted
      {
        $match: {
          organizationId,
          isActive: true,
          isDeleted: false,
        },
      },

      {
        $lookup: {
          from: 'dashboard_shares',
          let: { dashboardId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$dashboardId', '$$dashboardId'] },
                    { $eq: ['$sharedWithId', userId] },
                    { $eq: ['$organizationId', organizationId] },
                  ],
                },
              },
            },
          ],
          as: 'transfers',
        },
      },

      // Filter only those which are either:
      // - Created by the user
      // - Shareable
      // - Transferred to the user
      {
        $match: {
          $or: [{ createdBy: userId }, { isShareble: true }, { transfers: { $ne: [] } }],
        },
      },

      // Add isEdit field
      {
        $addFields: {
          isEdit: {
            $cond: [{ $eq: ['$createdBy', userId] }, true, false],
          },
        },
      },

      // Populate createdBy
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy',
        },
      },
      {
        $unwind: {
          path: '$createdBy',
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $facet: {
          data: [
            { $sort: sort || { createdAt: -1 } },
            ...(page && limit ? [{ $skip: page * limit }, { $limit: limit }] : []),
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
      {
        $addFields: {
          totalCount: {
            $ifNull: [{ $arrayElemAt: ['$totalCount.count', 0] }, 0],
          },
        },
      },

      {
        $project: {
          createdBy: {
            password: 0, // optional
            // exclude password or any other PII
          },

          // Exclude transfer info from final output
          transfers: 0,
        },
      },
      {
        $project: {
          data: {
            $map: {
              input: '$data',
              as: 'dashboard',
              in: {
                _id: '$$dashboard._id',
                name: '$$dashboard.name',
                description: '$$dashboard.description',
                isShareble: '$$dashboard.isShareble',
                isActive: '$$dashboard.isActive',
                isEdit: '$$dashboard.isEdit',
                organizationId: '$$dashboard.organizationId',
                createdAt: '$$dashboard.createdAt',
                updatedAt: '$$dashboard.updatedAt',
                widgetThemeId: '$$dashboard.widgetThemeId',
                settings: '$$dashboard.settings',
                createdBy: {
                  _id: '$$dashboard.createdBy._id',
                  name: '$$dashboard.createdBy.name',
                  email: '$$dashboard.createdBy.email',
                },
              },
            },
          },
          totalCount: 1,
        },
      },
    ];

    // Optional pagination
    // if (page && limit) {
    //   pipeline.push({ $skip: page * limit }, { $limit: limit });
    // }

    const result = await Dashboard.aggregate(pipeline);
    return {
      data: result[0]?.data || [],
      totalCount: result[0]?.totalCount || 0,
    };
  } catch (err) {
    throw err;
  }
};

export const getWidgetByIdData = async (payload: any) => {
  try {
    const { orgCode } = payload;
    const aggregatePipeline: any = [
      { $match: { dashboardId: payload.dashboardId } },
      {
        $lookup: {
          from: 'widget_types',
          localField: 'widgetTypeId',
          foreignField: '_id',
          as: 'widgetDetails',
        },
      },
      { $unwind: '$widgetDetails' },
      {
        $lookup: {
          from: 'data_sources',
          localField: 'dataSourceId',
          foreignField: '_id',
          as: 'dataSourceDetails',
        },
      },
      { $unwind: '$dataSourceDetails' },
    ];

    const dashboardWidgets = await DashboardWidget.aggregate(aggregatePipeline);
    // const chartDataResults: any = [];

    for (const widget of dashboardWidgets) {
      const aggregationPipeline = buildAggregationPipeline(widget);
      console.log('aggregationPipelineDy >>', JSON.stringify(aggregationPipeline));

      // console.log('aggregationPipeline', aggregationPipeline);
      const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
        orgCode,
        versionCode: widget.dataSourceDetails.code,
      });
      const DataSourceModel = createDefaultDataSourceVersionModel(schemaName);

      // console.log('aggregationPipeline', aggregationPipeline);
      // const aggregationPipeline: any = [
      //   {
      //     $addFields: {
      //       convertedDate: {
      //         $dateFromString: {
      //           dateString: '$rowData.DisclosureDate',
      //         },
      //       },
      //     },
      //   },
      //   {
      //     $match: {
      //       dataSourceId: widget.dataSourceId,
      //       convertedDate: {
      //         $gt: new Date('2024-01-01T00:00:00.000Z'),
      //         $lt: new Date('2025-01-01T00:00:00.000Z'),
      //       },
      //     },
      //   },
      //   {
      //     $group: {
      //       _id: {
      //         name: '$rowData.SBU',
      //         ...widget.groupBy.reduce((acc, field) => {
      //           acc[field] = `$rowData.${field}`;
      //           return acc;
      //         }, {}),
      //       },
      //       count: { $sum: 1 },
      //     },
      //   },
      //   // New stage to flatten the structure
      //   {
      //     $replaceRoot: {
      //       newRoot: {
      //         $mergeObjects: [
      //           '$_id', // Bring all _id fields to root
      //           { data: '$count' }, // Include the count
      //         ],
      //       },
      //     },
      //   },
      // ];

      // console.log('aggregationPipeline >>>', JSON.stringify(aggregationPipeline));
      // // Execute aggregation
      const dataResults: any = await DataSourceModel.aggregate(aggregationPipeline).exec();

      widget.data = dataResults;
    }

    return { data: dashboardWidgets };
  } catch (err) {
    throw err;
  }
};
