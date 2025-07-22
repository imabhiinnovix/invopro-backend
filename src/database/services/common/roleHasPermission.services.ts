/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import RoleHasPermission from '../../models/common/roleHasPermissionModel';

export const createUserRoleHasPermission = async (RoleHasPermissionData: any) => {
  try {
    const roleHasPermission = new RoleHasPermission(RoleHasPermissionData);
    await roleHasPermission.save();
    return roleHasPermission;
  } catch (err) {
    throw err;
  }
};

export const getPermissionsByRoleIds = async (roleIds: Types.ObjectId[]) => {
  const result = await RoleHasPermission.aggregate([
    {
      $match: {
        roleId: { $in: roleIds },
      },
    },
    {
      $lookup: {
        from: 'permissions', // 👈 collection name in MongoDB
        localField: 'permissionId',
        foreignField: '_id',
        as: 'permission',
      },
    },
    { $unwind: '$permission' },
    {
      $match: {
        'permission.status': 'active',
      },
    },
    {
      $group: {
        _id: {
          name: '$permission.name',
          method: '$permission.method',
          resourceId: '$permission.resourceId',
          resourceType: '$permission.resourceType',
          dataSourceId: '$permission.dataSourceId',
        },
        permissionId: { $first: '$permission._id' }, // any representative ID
      },
    },
    {
      $lookup: {
        from: 'data_sources',
        localField: '_id.dataSourceId',
        foreignField: '_id',
        as: 'dataSource',
      },
    },
    {
      $unwind: {
        path: '$dataSource',
        preserveNullAndEmptyArrays: true, // in case dataSourceId is null or doesn't match
      },
    },
    {
      $project: {
        _id: 0,
        name: '$_id.name',
        method: '$_id.method',
        resourceId: '$_id.resourceId',
        resourceType: '$_id.resourceType',
        dataSourceId: '$dataSource',
        permissionId: 1,
      },
    },
  ]);

  return result;
};
