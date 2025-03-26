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

export const getAllDashboards = async (query: any) => {
  try {
    const dashboard = await Dashboard.find(query).populate('createdBy organizationId', '-password');
    return dashboard;
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
