import { Request, Response, NextFunction } from 'express';
import * as userRoleService from '../../../database/services/common/userRole.service';
import { Types } from 'mongoose';
import { getPermissionsByRoleIds } from '../../../database/services/common/roleHasPermission.services';
export const getUserRoleList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { organizationId, isSuperUser } = req.user;
    const { search, organizationId: paramOrgId, paginate = true }: any = req.query;
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
      paginate
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
    //const query: any = { roleId, isChangeable: true };
    const query: any = { roleId };
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
    const { userId, isSuperUser } = req.user;

    let organizationId = req.user.organizationId;
    const {
      name,
      permissionIds = [],
      organizationId: bodyOrgId,
    } = req.body;

    let { roleType } = req.body;

    if (isSuperUser && bodyOrgId) {
      organizationId = bodyOrgId;
    }

    let finalPermissionIds = permissionIds;

    // 🔹 If permissionIds NOT provided → inherit
    if (!permissionIds || permissionIds.length === 0) {
      let baseRole;

      if (roleType) {
        // inherit from roleType ObjectId
        baseRole = await userRoleService.getUserRole({ organizationId, _id: roleType });
      } else {
        // fallback to "User" role
        baseRole = await userRoleService.getUserRole({
          organizationId,
          name: 'User',
        });
        roleType = baseRole._id;
      }
      if (!baseRole) {
        return res.status(400).json({
          success: false,
          message: 'Base role not found for permission inheritance',
        });
      }

      const basePermissions = await getPermissionsByRoleIds([baseRole._id]);
      finalPermissionIds = basePermissions.map(p => String(p.permissionId));
    }

    // Check if ACTIVE role with same name already exists
    const existingActiveRole = await userRoleService.getUserRole({
      organizationId,
      name,
      status: 'active',
    });

    if (existingActiveRole) {
      return res.status(400).json({
        success: false,
        message: `Role "${name}" already exists. Use Different Name.`,
      });
    }


    // 🔹 Create role (service unchanged)
    const newRole = await userRoleService.createUserRole({
      organizationId,
      name,
      permissionIds: finalPermissionIds,
      userId,
      roleType: roleType || null,
    });

    res.status(200).json({
      success: true,
      message: 'User role created successfully.',
      role: newRole,
    });
  } catch (err) {
    next(err);
  }
};



export const updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId } = req.user;
    const { roleId } = req.params;
    const { name, permissionIds } = req.body;
    let { roleType } = req.body;

    let finalPermissionIds = permissionIds;

    // 🔹 If permissionIds NOT provided → reset based on roleType / User
    if (!permissionIds) {
      let baseRole;

      if (roleType) {
        baseRole = await userRoleService.getUserRole({ organizationId, _id: roleType });
      } else {
        baseRole = await userRoleService.getUserRole({
          organizationId,
          name: 'User',
        });
        roleType = baseRole._id;
      }

      if (!baseRole) {
        return res.status(400).json({
          success: false,
          message: 'Base role not found for permission reset',
        });
      }

      const basePermissions = await getPermissionsByRoleIds([baseRole._id]);
      finalPermissionIds = basePermissions.map(p => String(p.permissionId));
    }

    // 🔹 Single service call
    await userRoleService.updateRole({
      roleId,
      name,
      permissionIds: finalPermissionIds,
      userId,
      roleType: roleType || null,
    });

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
