import cacheService from '../reportivix/cacheService';
import roleHasPermissionModel from '../../models/common/roleHasPermissionModel';
import { Request } from 'express';
import mongoose from 'mongoose';

interface PermissionMap {
  [resource: string]: string; // resource -> name
}

interface CustomRequest extends Request {
  roleId: string;
  organizationId: string;
}

export const checkPermission = async (req: Request) => {
  const roleIds = req.user.roleIds;
  const organizationId = req.user.organizationId;
  console.log(req.user);

  const checkPermissionResponse = {
    isAccess: false,
    message: 'Access Denied: You do not have permission to access this route.',
  };
  if (!Array.isArray(roleIds) || roleIds.length === 0) return checkPermissionResponse;

  // ✅ 2. Construct permission key
  const method = req.method.toUpperCase();
  const baseUrl = req.baseUrl;
  const routePath = req.route?.path || '';
  const baseUrlWithoutPrefix = baseUrl.replace(process.env.BASE_API_ROUTE || '', '');
  const resourceId = `${baseUrlWithoutPrefix}${routePath}`;
  const resourceKey = `${method}:${resourceId}`;

  // ✅ 3. Check permission by role
  for (const roleId of roleIds) {
    const permissions = await getPermissionsByRole(roleId, organizationId);

    if (permissions[resourceKey]) {
      return { isAccess: true, message: 'User has Permission' };
    }
  }

  return checkPermissionResponse;
};

export const getPermissionsByRole = async (roleId: string, organizationId: string): Promise<PermissionMap> => {
  const permissionsKey = `permissionsByRole:${organizationId}:${roleId}`;
  let permissions: PermissionMap | null = null;

  const cached = await cacheService.get(permissionsKey);

  if (cached) {
    permissions = JSON.parse(cached);
  } else {
    permissions = await getAccessibleRoutesByRole(roleId);
    await cacheService.set(permissionsKey, JSON.stringify(permissions), 3600);
  }

  return permissions || {};
};

const getAccessibleRoutesByRole = async (roleId: string): Promise<PermissionMap> => {
  try {
    if (!roleId) {
      throw new Error('Role ID is required');
    }

    const accessibleRoutes = await roleHasPermissionModel.aggregate([
      {
        $match: {
          roleId: new mongoose.Types.ObjectId(roleId),
          status: 1,
        },
      },
      {
        $lookup: {
          from: 'permissions',
          localField: 'permissionId',
          foreignField: '_id',
          as: 'permissionDetails',
        },
      },
      {
        $unwind: '$permissionDetails',
      },
      {
        $project: {
          _id: 0,
          resource: '$permissionDetails.resource',
          name: '$permissionDetails.name',
        },
      },
    ]);

    return accessibleRoutes.reduce<PermissionMap>((result, route) => {
      if (route.resource && route.name) {
        result[route.resource] = route.name;
      }
      return result;
    }, {});
  } catch (error) {
    console.error('Error fetching accessible routes:', error);
    throw error;
  }
};
