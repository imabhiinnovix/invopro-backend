import { Request, Response, NextFunction } from 'express';
import * as userRoleService from '../../../database/services/common/userRole.service';
import { Types } from 'mongoose';
import { getPermissionsByRoleIds } from '../../../database/services/common/roleHasPermission.services';
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
    const { paginate } = req.query;
    let { organizationId, isSuperUser } = req.user;
    const { organizationId: paramOrgId }: any = req.query;
    let page = parseInt(req.query.page as string, 10) || 1;
    let limit = parseInt(req.query.limit as string, 10) || 10;

    if (isSuperUser && paramOrgId) {
      organizationId = paramOrgId;
    }
    const query: any = { roleId, isChangeable: true };
    if (!paginate || paginate === 'false') {
      page = 1;
      limit = Number.MAX_SAFE_INTEGER; // effectively unlimited
    }

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
    const { userId, isSuperUser, roleType: roleName = 'User' } = req.user;

    let organizationId = req.user.organizationId;
    const { name, permissionIds = [], organizationId: bodyOrgId } = req.body;

    if (isSuperUser && bodyOrgId) {
      organizationId = bodyOrgId;
    }

    // 1️⃣ Get the base role (by name)
    const baseRole: any = await userRoleService.getUserRole({
      organizationId,
      name: roleName,
    });

    if (!baseRole) {
      return res.status(400).json({
        success: false,
        message: `Base role '${roleName}' not found.`,
      });
    }

    // 2️⃣ Fetch default permissions from RoleHasPermission using roleId
    const basePermissions = await getPermissionsByRoleIds([baseRole._id]);

    // Extract only permissionId list
    const basePermissionIds = basePermissions.map(p => String(p.permissionId));

    // 3️⃣ Merge + dedupe (base permissions + new permissions)
    const finalPermissionIds = [
      ...new Set([
        ...basePermissionIds,
        ...permissionIds.map(String),
      ])
    ];

    // 4️⃣ Call service — it creates role + inserts roleHasPermissions
    const newRole = await userRoleService.createUserRole({
      organizationId,
      name,
      permissionIds: finalPermissionIds,
      userId,
    });

    res.status(200).json({
      success: true,
      message: "User role created successfully.",
      role: newRole,
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
