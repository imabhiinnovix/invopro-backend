/* eslint-disable @typescript-eslint/no-explicit-any */
import TransferDashboard from '../models/transferDashboard';

export const getTransferDashboard = async (query: any) => {
  try {
    const data = await TransferDashboard.findOne(query);
    return data;
  } catch (err) {
    throw err;
  }
};

export const getAllTransferDashboard = async (query: any) => {
  try {
    const data = await TransferDashboard.find(query);
    return data;
  } catch (error) {
    throw error;
  }
};

export const createTransferDashboard = async (data: any) => {
  try {
    const transferDashboard = new TransferDashboard(data);
    await transferDashboard.save();
    return transferDashboard;
  } catch (err) {
    throw err;
  }
};
