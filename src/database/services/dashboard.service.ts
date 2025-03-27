/* eslint-disable @typescript-eslint/no-explicit-any */
import Dashboard from '../models/dashboard';

export const createDashboard = async (data: any) => {
  try {
    const response = new Dashboard(data);
    await response.save();
    return response;
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

export const getDashboard = async (query: any) => {
  try {
    const dashboard = await Dashboard.findOne(query).populate('createdBy organizationId', '-password');
    return dashboard;
  } catch (error: any) {
    throw new Error(error.message);
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
    let dashboardQuery = Dashboard.find(query).select(select).sort(sort);

    if (page && limit) {
      dashboardQuery = dashboardQuery.skip((page - 1) * limit).limit(limit);
    }

    if (sort) {
      dashboardQuery = dashboardQuery.sort(sort);
    }

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        dashboardQuery = dashboardQuery.populate(field);
      });
    }

    const users = await dashboardQuery.exec();

    const totalCount = await Dashboard.countDocuments(query);

    return { data: users, totalCount };
  } catch (error: any) {
    throw new Error(error.message);
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
