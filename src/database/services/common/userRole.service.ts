/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

/* eslint-disable @typescript-eslint/no-explicit-any */
import UserRole from '../../models/common/userRole';
import User from '../../models/common/user';

import Permission from '../../models/common/permissionModel';
import RoleHasPermission from '../../models/common/roleHasPermissionModel';

export const getUserRoleList = async ({
  query,
  page = 1,
  limit = 20,
  sort = { createdAt: -1 },
  populate = [],
  paginate = true
}: any) => {
  try {
    let queryBuilder = UserRole.find(query).sort(sort);

    if(paginate){
      queryBuilder = queryBuilder
        .skip((page - 1) * limit)
        .limit(limit);
    }  

    if (populate.length) {
      populate.forEach((field) => {
        queryBuilder = queryBuilder.populate(field);
      });
    }

    const data = await queryBuilder.exec();
    const totalCount = await UserRole.countDocuments(query);

    return {
      data,
      totalCount,
    };
  } catch (err) {
    throw err;
  }
};

export const getPermissionDetailsBasedOnRoleId = async ({
  query,
  page = 1,
  limit = 20,
  sort = { createdAt: -1 },
  populate = [],
}: any) => {
  try {
    let queryBuilder = RoleHasPermission.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    if (populate.length) {
      populate.forEach((field) => {
        queryBuilder = queryBuilder.populate(field);
      });
    }

    const data = await queryBuilder.exec();
    const totalCount = await RoleHasPermission.countDocuments(query);

    return {
      data,
      totalCount,
    };
  } catch (err) {
    throw err;
  }
};

export const createUserRole = async ({
  organizationId,
  name,
  isSuperUser = false,
  permissionIds,
  userId,
  roleType,
}: {
  organizationId: string;
  name: string;
  isSuperUser?: boolean;
  permissionIds: string[];
  userId: string;
  roleType: string;
}) => {
  try {
    // 1. Create the role
    const [newRole] = await UserRole.create([
      {
        organizationId,
        name,
        isSuperUser,
        createdBy: userId,
        roleType
      },
    ]);

    // 2. Validate the permission IDs
    const validPermissions = await Permission.find({
      _id: { $in: permissionIds },
    });

    if (validPermissions.length !== permissionIds.length) {
      throw new Error('Some permissionIds are invalid.');
    }

    // 3. Insert into role_permission table
    const rolePermissionDocs = permissionIds.map((permId) => ({
      roleId: newRole._id,
      permissionId: permId,
    }));

    await RoleHasPermission.insertMany(rolePermissionDocs);

    return newRole;
  } catch (err) {
    throw err;
  }
};

export const updateRole = async ({
  roleId,
  name,
  permissionIds,
  userId,
  roleType
}: {
  roleId: string;
  name?: string;
  permissionIds?: string[];
  userId: string;
  roleType: string;
}) => {
  try {
    // 1. Update role fields
    const updateData: any = { updatedBy: userId };
    if (name !== undefined) updateData.name = name;
    if (roleType !== undefined) updateData.roleType = roleType;

    const updatedRole = await UserRole.findByIdAndUpdate(roleId, updateData, { new: true });
    if (!updatedRole) throw new Error('Role not found');

    // 2. Update permissions only if provided
    if (permissionIds) {
      // 🔹 Delete only changeable ones
      await RoleHasPermission.deleteMany({ roleId, isChangeable: true });

      // 🔹 Validate only changeable permissionIds
      const validPermissions = await Permission.find({
        isChangeable: true,
        _id: { $in: permissionIds },
      }).select('_id');

      // 🔹 Create new mappings (isChangeable: true)
      const rolePermissionDocs = validPermissions.map((perm) => ({
        roleId: updatedRole._id,
        permissionId: perm._id,
        isChangeable: true,
        updatedBy: userId,
      }));

      // 🔹 Insert only changeable ones
      await RoleHasPermission.insertMany(rolePermissionDocs);
    }

    return updatedRole;
  } catch (err) {
    throw err;
  }
};

export const deleteRole = async (roleId: any) => {
  try {
    // 1. Remove the role from all users
    await User.updateMany({ roleIds: roleId }, { $pull: { roleIds: roleId } });

    // 2. Delete all role-permission mappings
    await RoleHasPermission.deleteMany({ roleId });

    // 3. Delete the role itself
    const deletedRole = await UserRole.findByIdAndDelete(roleId);
    if (!deletedRole) {
      throw new Error('Role not found');
    }

    return {
      success: true,
      message: 'Role and all related data deleted successfully.',
    };
  } catch (err) {
    throw err;
  }
};

export const getUserRole = async (query: any) => {
  try {
    const userRole = await UserRole.findOne(query);
    return userRole;
  } catch (err) {
    throw err;
  }
};
