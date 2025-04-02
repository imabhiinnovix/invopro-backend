/* eslint-disable @typescript-eslint/no-explicit-any */
import DashboardWidget from '../models/dashboardWidget';

export const createDashboardWidget = async (widgetData: any) => {
  try {
    const widget = new DashboardWidget(widgetData);
    await widget.save();
    return widget;
  } catch (err) {
    throw err;
  }
};

export const getDashboardWidget = async (query: any, populate: any) => {
  try {
    let widgetsQuery = DashboardWidget.findOne(query);

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        widgetsQuery = widgetsQuery.populate(field);
      });
    }

    const dashboardWidget = await widgetsQuery.exec();

    return dashboardWidget;
  } catch (err) {
    throw err;
  }
};

export const getAllDashboardWidgets = async ({
  query,
  select = '',
  page,
  limit,
  sort = { createdAt: -1 },
  populate,
}: any) => {
  try {
    let widgetsQuery = DashboardWidget.find(query)
      .select(select)
      .skip(page * limit)
      .limit(limit)
      .sort(sort);

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        widgetsQuery = widgetsQuery.populate(field);
      });
    }

    const dashboardWidgets = await widgetsQuery.exec();

    const totalCount = await DashboardWidget.countDocuments(query);

    // return widget;
    return { data: dashboardWidgets, totalCount };
  } catch (err) {
    throw err;
  }
};

export const updateDashboardWidget = async (id: string, widgetData: any) => {
  try {
    const widget = await DashboardWidget.findByIdAndUpdate(id, widgetData, { new: true });
    return widget;
  } catch (err) {
    throw err;
  }
};

export const deleteDashboardWidget = async (id: string) => {
  try {
    await DashboardWidget.findByIdAndDelete(id);
  } catch (err) {
    throw err;
  }
};
