/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import mongoose from "mongoose";
import UserDataPermissionModel from "../../models/common/userDataPermission";

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
  select = "",
  page = 1,
  limit = 10,
  sort = { updatedAt: -1 },
  populate,
  isPaginate = true,
}: any) => {
  try {
    // ✅ Default filter: only active records unless explicitly specified
    if (!query.status) query.status = "active";

    let userPermissionQuery: any = UserDataPermissionModel.find(query)
      .select(select)
      .sort(sort);

    // ✅ Apply pagination only if isPaginate = true
    if (isPaginate) {
      const skip = (page - 1) * limit;
      userPermissionQuery = userPermissionQuery.skip(skip).limit(limit);
    }

    // ✅ Populate related fields if specified
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


export const updateUserDataPermission = async (
  query: Record<string, any>,
  updateFields: Record<string, any>
) => {
  try {
    const result = await UserDataPermissionModel.updateMany(query, {
      $set: updateFields,
    });
    return result;
  } catch (err) {
    throw err;
  }
};

export const getUserDataPermissionRecord = async (query) => {
  try {
    // ✅ Default filter: only active records unless explicitly specified
    if (!query.status) query.status = "active";
    const matchingDoc = await UserDataPermissionModel.findOne(query);
    return matchingDoc;
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

/**
 * -------------------------------------------------------
 * 🧩 Soft Delete User Data Permission
 * -------------------------------------------------------
 * This will mark the record as 'in-active' instead of removing it
 */
export const deleteUserDataPermission = async (query: Record<string, any>) => {
  try {
    const result = await UserDataPermissionModel.updateMany(query, {
      $set: { status: "in-active", updatedAt: new Date() },
    });
    return result;
  } catch (err) {
    throw err;
  }
};

// services/common/userDataPermission.service.ts

export const createUserDataPermissionMany = async (values: any[]) => {
  try {
    if (!Array.isArray(values) || !values.length) return [];

    const resp = await UserDataPermissionModel.insertMany(values, {
      ordered: false, // continue even if some fail (duplicate key, etc.)
    });

    return resp;
  } catch (err) {
    throw err;
  }
};
