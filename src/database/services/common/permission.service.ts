/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import Permission from '../../models/common/permissionModel';

export const getPermissionList = async ({
  query,
  page = 1,
  limit = 20,
  sort = { createdAt: -1 },
  populate = [],
}: any) => {
  try {
    let queryBuilder = Permission.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    if (populate.length) {
      populate.forEach((field) => {
        queryBuilder = queryBuilder.populate(field);
      });
    }

    const data = await queryBuilder.exec();
    const totalCount = await Permission.countDocuments(query);

    return {
      data,
      totalCount,
    };
  } catch (err) {
    throw err;
  }
};

export const createPermission = async (data: any) => {
  const exists = await Permission.findOne({
    method: data.method,
    resourceId: data.resourceId,
  });
  if (exists) {
    throw new Error('Permission with this method and resource already exists.');
  }
  const permission = new Permission(data);
  return await permission.save();
};

export const getAllPermissions = async () => {
  return await Permission.find();
};

export const getPermissionById = async (id: string) => {
  return await Permission.findById(id);
};

export const updatePermission = async (id: string, data: any) => {
  return await Permission.findByIdAndUpdate(id, data, { new: true });
};

export const deletePermission = async (id: string) => {
  return await Permission.findByIdAndDelete(id);
};
