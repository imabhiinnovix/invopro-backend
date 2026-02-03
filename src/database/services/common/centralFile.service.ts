/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import CentralFile from '../../models/common/centralFile';

export const findCentralFiles = async (query: any) => {
  return await CentralFile.find(query);
};

export const findLatestCentralFile = async (query: any) => {
  return await CentralFile.findOne(query).sort({ version: -1 });
};

export const findCentralFileById = async (id: string) => {
  return await CentralFile.findById(id);
};

export const createCentralFile = async (data: any) => {
  const file = new CentralFile(data);
  return await file.save();
};

export const updateCentralFiles = async (query: any, updateData: any) => {
  return await CentralFile.updateMany(query, updateData);
};

export const updateCentralFileById = async (id: string, updateData: any) => {
  return await CentralFile.findByIdAndUpdate(id, updateData, { new: true });
};

export const getCentralFileList = async ({ query, page, limit }: any) => {
  const data = await CentralFile.find(query)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalCount = await CentralFile.countDocuments(query);

  return { data, totalCount };
};