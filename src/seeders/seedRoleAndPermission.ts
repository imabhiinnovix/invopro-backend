import mongoose, { Types } from 'mongoose';
import Permission from '../database/models/common/permissionModel'; // adjust path if needed
import UserRole from '../database/models/common/userRole';
import RoleHasPermission from '../database/models/common/roleHasPermissionModel';
import Organization from '../database/models/common/organization';

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
  'POST:/common/permission/create',
  'GET:/common/role/list',
  'GET:/common/role/:roleId',
  'POST:/common/role/create',
  'PUT:/common/role/update/:roleId',
  'DELETE:/common/role/delete/:roleId',
  'GET:/common/product-subscription/list',
  'GET:/common/organization/get-current-organization',
];

const defaultPermissionsPrimarySuperAdmin = [
  ...defaultPermissionsAdmin,
  'GET:/common/product/list',
  'POST:/common/organization/create',
  'PUT:/common/organization/update/:organizationId',
  'DELETE:/common/organization/delete/:organizationId',
  'GET:/common/organization/list',
  'GET:/common/organization/:organizationId',
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
  organizationId: Types.ObjectId[];
}

export async function seedRolesAndPermissions(payload: SeedPayload) {
  const { organizationId } = payload;

  if (!organizationId || !Array.isArray(organizationId)) {
    throw new Error('organizationId array is required to seed roles and permissions');
  }

  for (const orgId of organizationId) {
    const organization = await Organization.findById(orgId);

    if (!organization) {
      console.warn(`⚠️ Organization not found: ${orgId}`);
      continue;
    }

    for (const roleItem of defaultRolesAndPermissions) {
      const { roleName, isSuperUser, permissionsList } = roleItem;

      // ❌ Only allow Super Admin creation for master organizations
      if (isSuperUser && !organization.isMaster) {
        console.info(`⏭️ Skipping Super Admin role for non-master organization: ${organization.name}`);
        continue;
      }

      let role = await UserRole.findOne({
        organizationId: orgId,
        name: roleName,
      });

      if (!role) {
        role = new UserRole({
          organizationId: orgId,
          name: roleName,
          isSuperUser,
          status: 'active',
        });

        await role.save();
        console.log(`✅ Role "${roleName}" created for org "${organization.name}"`);
      } else {
        console.log(`ℹ️ Role "${roleName}" already exists for org "${organization.name}"`);
      }

      for (const methodResource of permissionsList) {
        const [method, ...rest] = methodResource.split(':');
        const resourceId = rest.join(':');

        const permissionDoc = await Permission.findOne({ method, resourceId });

        if (!permissionDoc) {
          console.warn(`⚠️ Permission not found: ${method}:${resourceId}`);
          continue;
        }

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
}
