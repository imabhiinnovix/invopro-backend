import { Request, Response, NextFunction } from "express";
import {
  createUserDataPermission,
  getUserDataPermissionList,
  updateUserDataPermission,
  deleteUserDataPermission,
  getUserDataPermissionRecord, // from service
} from "../../../database/services/common/userDataPermission.service";
import { Types } from "mongoose";

/**
 * -------------------------------------------------------
 * 🧩 User Data Permission Controller
 * -------------------------------------------------------
 */

// ✅ Create new user data permission
export const createUserPermission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId: paramOrgId, dataSourceId, conditions } = req.body;
    let { userId: createdBy, organizationId, isSuperUser } = req.user;
    // ✅ Super user override
    if (isSuperUser && paramOrgId) {
      organizationId = paramOrgId as string;
    }
    const payload = {
      userId,
      organizationId,
      dataSourceId,
      conditions,
      createdBy,
      updatedBy: createdBy,
      status: "active",
    };

    const data = await createUserDataPermission(payload);

    res.status(201).json({
      success: true,
      message: "User Data Permission Created Successfully",
      data,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ List user data permissions (supports pagination toggle)
export const listUserPermission = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let { organizationId, isSuperUser } = req.user;
    const { organizationId: paramOrgId } = req.query;
    const {
      search,
      dataSourceId,
      userId,
      page = 1,
      limit = 10,
      sort,
      isPaginate = "true",
    } = req.query;

    // ✅ Parse numeric & boolean values
    const parsedPage = parseInt(page as string, 10) || 1;
    const parsedLimit = parseInt(limit as string, 10) || 10;
    const paginateFlag = isPaginate !== "false";

    // ✅ Super user override
    if (isSuperUser && paramOrgId) {
      organizationId = paramOrgId as string;
    }

    // ✅ Build Mongo query safely
    const query: any = {
      organizationId: new Types.ObjectId(organizationId),
      status: "active",
    };

    if (userId) query.userId = new Types.ObjectId(userId as string);
    if (dataSourceId) query.dataSourceId = new Types.ObjectId(dataSourceId as string);

    if (search) {
      query["$or"] = [
        { "conditions.field": { $regex: search as string, $options: "i" } },
        { "conditions.value": { $regex: search as string, $options: "i" } },
      ];
    }

    // ✅ Fetch data from service
    const result = await getUserDataPermissionList({
      query,
      page: parsedPage,
      limit: parsedLimit,
      sort: sort ? JSON.parse(sort as string) : { updatedAt: -1 },
      populate: ["userId", "organizationId", "dataSourceId"],
      isPaginate: paginateFlag,
    });

    // ✅ Pagination calculation
    const totalPages = paginateFlag
      ? Math.ceil(result.totalCount / parsedLimit)
      : 1;

    res.status(200).json({
      success: true,
      message: "User Data Permissions Retrieved Successfully",
      data: result.data,
      pagination: paginateFlag
        ? {
            page: parsedPage,
            limit: parsedLimit,
            totalPages,
            totalRecords: result.totalCount,
          }
        : undefined,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Update user data permission
export const updateUserPermission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { conditions, status } = req.body;
    const { userId:updatedBy } = req.user;

    const updateFields: any = {
      updatedBy,
      ...(conditions && { conditions }),
      ...(status && { status }),
    };

    const result = await updateUserDataPermission({ _id: id }, updateFields);

    res.status(200).json({
      success: true,
      message: "User Data Permission Updated Successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Soft delete user data permission
export const deleteUserPermission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await deleteUserDataPermission({_id: id});

    res.status(200).json({
      success: true,
      message: "User Data Permission Deleted Successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Get single user data permission by ID
export const getUserPermissionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, organizationId: paramOrgId } = req.params;
    let { organizationId, isSuperUser } = req.user;
    if (isSuperUser && paramOrgId) {
      organizationId = paramOrgId;
    }
    const data = await getUserDataPermissionRecord({
      _id: id,
      organizationId,
      status: "active",
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "User Data Permission not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User Data Permission Retrieved Successfully",
      data,
    });
  } catch (err) {
    next(err);
  }
};
