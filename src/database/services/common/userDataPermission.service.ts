/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import mongoose from 'mongoose';
import UserDataPermissionModel from '../../models/common/userDataPermission';

/**
 * -------------------------------------------------------
 * 🧩 User Data Permission Service
 * -------------------------------------------------------
 */

export const createUserDataPermission = async (value: any) => {
  try {
    const resp = await UserDataPermissionModel.create(value);
    return resp;
  } catch (err) {
    throw err;
  }
};

export const getUserDataPermissionList = async ({
  query,
  select = '',
  page,
  limit,
  sort = { updatedAt: -1 },
  populate,
}: any) => {
  try {
    let userPermissionQuery: any = UserDataPermissionModel.find(query)
      .select(select)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        userPermissionQuery = userPermissionQuery.populate(field);
      });
    }

    const data = await userPermissionQuery.exec();
    const totalCount = await UserDataPermissionModel.countDocuments(query);

    return { data, totalCount };
  } catch (err) {
    throw err;
  }
};

export const updateUserDataPermission = async (query: Record<string, any>, updateFields: Record<string, any>) => {
  try {
    const result = await UserDataPermissionModel.updateMany(query, { $set: updateFields });
    return result;
  } catch (err) {
    throw err;
  }
};

export const getUserDataPermissionRecord = async (query) => {
  try {
    const matchingDocs = await UserDataPermissionModel.findOne(query);
    return matchingDocs;
  } catch (error) {
    throw error;
  }
};

export const getUserDataPermissionRecordsCount = async (query) => {
  try {
    const totalCount = await UserDataPermissionModel.countDocuments(query);
    return totalCount;
  } catch (error) {
    throw error;
  }
};
