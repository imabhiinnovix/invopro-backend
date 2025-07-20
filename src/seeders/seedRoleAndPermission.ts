import mongoose from 'mongoose';
import Permission from '../database/models/common/permissionModel'; // adjust path if needed
import UserRole from '../database/models/common/userRole';
import RoleHasPermission from '../database/models/common/roleHasPermissionModel';

const defaultPermissionsUser = [
  'GET:/common/user/get-current-user',
  'PUT:/common/user/update-current-user',
  'PUT:/common/user/change-password',
];

const defaultPermissionsAdmin = [
  ...defaultPermissionsUser,
  'POST:/common/user/create',
  'GET:/common/user/list',
  'GET:/common/user/:userId',
  'PUT:/common/user/update/:userId',
  'DELETE:/common/user/delete/:userId',
  'GET:/common/permission/list',
  'GET:/common/role/list',
  'GET:/common/role/:roleId',
  'POST:/common/role',
  'PUT:/common/role/update/:roleId',
  'DELETE:/common/role/delete/:roleId',
];

const defaultPermissionsPrimarySuperAdmin = [
  ...defaultPermissionsAdmin,
  'POST:/organization/create',
  'GET:/organization/list',
  'GET:/organization/:id',
  'PUT:/organization/update/:id',
  'DELETE:/organization/delete',
  'POST:/user/permission/create',
  'PUT:/user/permission/update/:id',
  'DELETE:/user/permission/delete/:id',
  'GET:/user/permission/list',
  'GET:/user/permission/:roleId',
];

const defaultRolesAndPermissions = [
  {
    roleName: 'User',
    isSuperUser: false,
    permissionsList: defaultPermissionsUser,
  },
  {
    roleName: 'Admin',
    isSuperUser: false,
    permissionsList: defaultPermissionsAdmin,
  },
  {
    roleName: 'Super Admin',
    isSuperUser: true,
    permissionsList: defaultPermissionsPrimarySuperAdmin,
  },
];

interface SeedPayload {
  organizationId: string;
}

export async function seedRolesAndPermissions(payload: SeedPayload) {
  const { organizationId } = payload;

  if (!organizationId) {
    throw new Error('organizationId is required to seed roles and permissions');
  }

  for (const roleItem of defaultRolesAndPermissions) {
    const { roleName, isSuperUser, permissionsList } = roleItem;

    // Check if role exists
    let role = await UserRole.findOne({
      organizationId,
      name: roleName,
    });

    if (!role) {
      role = new UserRole({
        organizationId,
        name: roleName,
        isSuperUser,
        status: 'active',
      });

      await role.save();
      console.log(`✅ Role "${roleName}" created.`);
    } else {
      console.log(`ℹ️ Role "${roleName}" already exists.`);
    }

    // Resolve permissionIds from method:resourceId
    for (const methodResource of permissionsList) {
      const [method, ...rest] = methodResource.split(':');
      const resourceId = rest.join(':');

      const permissionDoc = await Permission.findOne({
        method,
        resourceId,
      });

      if (!permissionDoc) {
        console.warn(`⚠️ Permission not found: ${method}:${resourceId}`);
        continue;
      }

      // Check if role already has this permission
      const existing = await RoleHasPermission.findOne({
        roleId: role._id,
        permissionId: permissionDoc._id,
      });

      if (!existing) {
        await new RoleHasPermission({
          roleId: role._id,
          permissionId: permissionDoc._id,
          status: 'active',
        }).save();

        console.log(`✅ Permission assigned to ${roleName}: ${method}:${resourceId}`);
      } else {
        console.log(`ℹ️ Permission already assigned to ${roleName}: ${method}:${resourceId}`);
      }
    }
  }
}
