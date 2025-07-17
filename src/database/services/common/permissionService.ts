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

export const checkPermission = async (req: any): Promise<boolean> => {
  const baseUrl = req.baseUrl;
  const routePath = req.route?.path || ''; // fallback in case it's undefined
  const baseUrlWithoutPrefix = baseUrl.replace(process.env.BASE_API_ROUTE || '', '');
  const roleId = req.roleId;
  const organizationId = req.organizationId;

  const resource = `${req.method}:${baseUrlWithoutPrefix}${routePath}`;
  const permissions = await getPermissionsByRole(roleId, organizationId);

  return resource in permissions;
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
