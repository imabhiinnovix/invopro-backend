/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSchemaNameBasedOnVersionCodeAndOrgCode } from '../../utils/common.utils';
import Dashboard from '../models/dashboard';
import DashboardWidget from '../models/dashboardWidget';
import createDefaultDataSourceVersionModel from '../models/defaultDataSourceVersionModel';

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

// export const getDashboardChartData = async (payload: any) => {
//   try {
//     const { orgCode } = payload;
//     const aggreagatePipeline: any = [
//       {
//         $match: { dashboardId: payload.dashboardId },
//       },
//       {
//         $lookup: {
//           from: 'widget_types',
//           localField: 'widgetTypeId',
//           foreignField: '_id',
//           as: 'widgetDetails',
//         },
//       },
//       {
//         $unwind: '$widgetDetails',
//       },
//       {
//         $lookup: {
//           from: 'data_sources',
//           localField: 'dataSourceId',
//           foreignField: '_id',
//           as: 'dataSourceDetails',
//         },
//       },
//       {
//         $unwind: '$dataSourceDetails',
//       },
//     ];

//     const DashboardWidgetData = await DashboardWidget.aggregate(aggreagatePipeline);

//     const dataValue: any = [];
//     for (const element of DashboardWidgetData) {
//       const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
//         orgCode: orgCode,
//         versionCode: element.dataSourceDetails.code,
//       });

//       const DataSourceVersionValue = createDefaultDataSourceVersionModel(schemaName);

//       const aggregationPipeline: any[] = [{ $skip: 0 }, { $limit: 1 }];

//       const dataSourceValue: any = await DataSourceVersionValue.aggregate(aggregationPipeline).exec();

//       dataValue.push(dataSourceValue);
//     }

//     return { data: DashboardWidgetData, dataSourceValue: dataValue };
//   } catch (err) {
//     throw err;
//   }
// };

export const getDashboardChartData = async (payload: any) => {
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
    const chartDataResults: any = [];

    for (const widget of dashboardWidgets) {
      const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
        orgCode,
        versionCode: widget.dataSourceDetails.code,
      });
      const DataSourceModel = createDefaultDataSourceVersionModel(schemaName);

      const aggregationPipeline: any = [
        {
          $addFields: {
            convertedDate: {
              $dateFromString: {
                dateString: '$rowData.DisclosureDate',
              },
            },
          },
        },
        {
          $match: {
            dataSourceId: widget.dataSourceId,
            convertedDate: {
              $gt: new Date('2024-01-01T00:00:00.000Z'),
              $lt: new Date('2025-01-01T00:00:00.000Z'),
            },
          },
        },
        {
          $group: {
            _id: {
              name: '$rowData.SBU',
              ...widget.groupBy.reduce((acc, field) => {
                acc[field] = `$rowData.${field}`;
                return acc;
              }, {}),
            },
            count: { $sum: 1 },
          },
        },
        // New stage to flatten the structure
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                '$_id', // Bring all _id fields to root
                { data: '$count' }, // Include the count
              ],
            },
          },
        },
      ];

      // Execute aggregation
      const dataResults: any = await DataSourceModel.aggregate(aggregationPipeline).exec();

      chartDataResults.push(dataResults);
    }

    return { data: dashboardWidgets, dataResults: chartDataResults };
  } catch (err) {
    throw err;
  }
};
