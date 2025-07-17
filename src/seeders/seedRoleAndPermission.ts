import mongoose from 'mongoose';
import Permission from '../database/models/common/permissionModel'; // adjust path if needed
import UserRole from '../database/models/common/userRole';
import RoleHasPermission from '../database/models/common/roleHasPermissionModel';

const defaultPermissionsUser = [
  'POST:/doc/type/create',
  'GET:/doc/type/list',
  'GET:/doc/type/list-priority',
  'GET:/doc/type/:id',
  'PUT:/doc/type/update/:id',
  'PUT:/doc/type/update-priority',
  'DELETE:/doc/type/delete',
  'GET:/doc/type/list/meta',
  'POST:/doc/category/create',
  'GET:/doc/category/list',
  'GET:/doc/category/:id',
  'PUT:/doc/category/update/:id',
  'DELETE:/doc/category/delete',
  'POST:/job/create',
  'GET:/job/list',
  'GET:/job/list-meta',
  'GET:/job/docs/:jobId',
  'PUT:/job/reference-file/:jobId',
  'GET:/job/get-reference/:jobId',
  'GET:/job/download-excel/:jobId',
  'GET:/job/matched-reference/:jobId',
  'GET:/job/:jobId',
  'POST:/job/create-text-conversion',
  'GET:/validator/operators',
  'POST:/validator/process-excel',
  'POST:/validator/create',
  'GET:/validator/list',
  'GET:/validator/:id',
  'PUT:/validator/update/:id',
  'POST:/validator/validate-file/:validatorId',
  'GET:/validator/validate-file-download/:validationId',
  'DELETE:/validator/delete/:validatorId',
  'POST:/doc/type/duplicate',
  'GET:/user/getCurrentUser',
  'POST:/attribute/create',
  'PUT:/attribute/update/:id',
  'GET:/attribute/search',
  'GET:/attribute/list',
  'DELETE:/attribute/delete',
  'GET:/attribute/:id',
  'PUT:/doc/update-attribute/:docId',
  'GET:/doc/list-update-history/:docId',
];

const defaultPermissionsAdmin = [
  ...defaultPermissionsUser,
  'POST:/common/user/create',
  'GET:/common/user/list',
  'GET:/common/user/:userId',
  'PUT:/common/user/update',
  'PUT:/common/user/update/:userId',
  'DELETE:/common/user/delete/:userId',
  'GET:/common/role/list',
];

const defaultPermissionsSuperAdmin = [
  ...defaultPermissionsAdmin,
  'POST:/role/create',
  'GET:/role/:id',
  'DELETE:/role/delete',
  'PUT:/role/update/:id',
  'GET:/doc/doc-type-export',
  'POST:/doc/doc-type-import',
];

const defaultPermissionsPrimarySuperAdmin = [
  ...defaultPermissionsSuperAdmin,
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
      const [method, resourceId] = methodResource.split(':');

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
