import { Request, Response, NextFunction } from 'express';
import * as userRoleService from '../../../database/services/common/userRole.service';
import { Types } from 'mongoose';
export const getUserRoleList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { organizationId, isSuperUser } = req.user;
    const { search, organizationId: paramOrgId }: any = req.query;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    if (isSuperUser && paramOrgId) {
      organizationId = paramOrgId;
    }

    const query: any = { organizationId };
    if (!isSuperUser) {
      query['isSuperUser'] = false;
    }

    if (search) query.name = { $regex: search, $options: 'i' };
    const { data, totalCount } = await userRoleService.getUserRoleList({
      query,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      data,
      totalCount,
    });
  } catch (err) {
    next(err);
  }
};

export const getRolePermissionList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roleId } = req.params;

    let { organizationId, isSuperUser } = req.user;
    const { organizationId: paramOrgId }: any = req.query;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    if (isSuperUser && paramOrgId) {
      organizationId = paramOrgId;
    }
    const query: any = { roleId };

    const { data, totalCount } = await userRoleService.getPermissionDetailsBasedOnRoleId({
      query,
      page,
      limit,
      populate: ['permissionId'],
    });

    res.status(200).json({
      success: true,
      data,
      totalCount,
    });
  } catch (err) {
    next(err);
  }
};

export const createUserRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, isSuperUser } = req.user;
    let organizationId = req.user.organizationId;
    const { name, permissionIds, organizationId: bodyOrgId } = req.body;
    if (isSuperUser && bodyOrgId) {
      organizationId = bodyOrgId;
    }
    await userRoleService.createUserRole({ organizationId, name, permissionIds, userId });

    res.status(200).json({
      success: true,
      message: 'User role created successfully.',
    });
  } catch (err) {
    next(err);
  }
};

export const updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user;
    const { roleId } = req.params;
    const { name, permissionIds } = req.body;
    await userRoleService.updateRole({ roleId, name, permissionIds, userId });

    res.status(200).json({
      success: true,
      message: 'User role updated successfully.',
    });
  } catch (err) {
    next(err);
  }
};

export const deleteUserRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roleId } = req.params;
    await userRoleService.deleteRole(roleId);

    res.status(200).json({
      success: true,
      message: 'User role deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};
