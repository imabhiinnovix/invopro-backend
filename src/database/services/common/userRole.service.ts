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
}: any) => {
  try {
    let queryBuilder = UserRole.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

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

export const createUserRole = async ({
  organizationId,
  name,
  isSuperUser = false,
  permissionIds,
  userId,
}: {
  organizationId: string;
  name: string;
  isSuperUser?: boolean;
  permissionIds: string[];
  userId: string;
}) => {
  const session = await UserRole.startSession();
  session.startTransaction();

  try {
    // 1. Create the role
    const [newRole] = await UserRole.create(
      [
        {
          organizationId,
          name,
          isSuperUser,
          createdBy: userId,
        },
      ],
      { session }
    );

    // 2. Validate the permission IDs
    const validPermissions = await Permission.find({
      _id: { $in: permissionIds },
    }).session(session);

    if (validPermissions.length !== permissionIds.length) {
      throw new Error('Some permissionIds are invalid.');
    }

    // 3. Insert into role_permission table
    const rolePermissionDocs = permissionIds.map((permId) => ({
      roleId: newRole._id,
      permissionId: permId,
    }));

    await RoleHasPermission.insertMany(rolePermissionDocs, { session });

    await session.commitTransaction();
    session.endSession();

    return newRole;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

export const updateRole = async ({
  roleId,
  name,
  isSuperUser,
  permissionIds,
  userId,
}: {
  roleId: string;
  name?: string;
  isSuperUser?: boolean;
  permissionIds?: string[];
  userId: string;
}) => {
  const session = await UserRole.startSession();
  session.startTransaction();

  try {
    // 1. Update role fields
    const updateData: any = { updatedBy: userId };
    if (name !== undefined) updateData.name = name;

    // if (isSuperUser !== undefined) updateData.isSuperUser = isSuperUser;

    const updatedRole = await UserRole.findByIdAndUpdate(roleId, updateData, { new: true, session });

    if (!updatedRole) throw new Error('Role not found');

    // 2. If permissionIds provided, validate and update role_permission mapping
    if (permissionIds) {
      // Validate
      const validPermissions = await Permission.find({
        _id: { $in: permissionIds },
      }).session(session);

      if (validPermissions.length !== permissionIds.length) {
        throw new Error('Some permissionIds are invalid.');
      }

      // Remove existing role-permission mappings
      await RoleHasPermission.deleteMany({ roleId }).session(session);

      // Insert new mappings
      const rolePermissionDocs = permissionIds.map((permId) => ({
        roleId: updatedRole._id,
        permissionId: permId,
      }));

      await RoleHasPermission.insertMany(rolePermissionDocs, { session });
    }

    await session.commitTransaction();
    session.endSession();

    return updatedRole;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

export const deleteRole = async (roleId: any) => {
  const session = await UserRole.startSession();
  session.startTransaction();

  try {
    // 1. Remove the role from all users
    await User.updateMany({ roleIds: roleId }, { $pull: { roleIds: roleId } }, { session });

    // 2. Delete all role-permission mappings
    await RoleHasPermission.deleteMany({ roleId }, { session });

    // 3. Delete the role itself
    const deletedRole = await UserRole.findByIdAndDelete(roleId).session(session);
    if (!deletedRole) {
      throw new Error('Role not found');
    }

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      message: 'Role and all related data deleted successfully.',
    };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};
