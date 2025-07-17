import { Request, Response, NextFunction } from 'express';
import * as userRoleService from '../../../database/services/common/userRole.service';

export const getUserRoleList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;
    await userRoleService.getUserRoleList({ organizationId });

    res.status(200).json({
      success: true,
      message: 'User role created successfully.',
    });
  } catch (err) {
    next(err);
  }
};

export const createUserRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId } = req.user;
    const { name, permissionIds } = req.body;
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
    const { name, permissionIds, roleId } = req.body;
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
    const { roleId } = req.query;
    await userRoleService.deleteRole({ roleId });

    res.status(200).json({
      success: true,
      message: 'User role deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};
