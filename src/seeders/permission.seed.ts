import Permission from '../database/models/common/permissionModel'; // Your Mongoose model

const permissions = [
  { name: 'List User', method: 'GET', resourceId: '/common/user/list', extraOptions: {}, resourceType: 'User' },
  {
    name: 'Get Current User',
    method: 'GET',
    resourceId: '/common/user/get-current-user',
    extraOptions: {},
    resourceType: 'User',
    isSuperUser: false,
  },
  { name: 'Get User', method: 'GET', resourceId: '/common/user/:userId', resourceType: 'User', isSuperUser: false },
  {
    name: 'Create User',
    method: 'POST',
    resourceId: '/common/user/create',
    extraOptions: {},
    resourceType: 'User',
    isSuperUser: false,
  },
  {
    name: 'Update Current User',
    method: 'PUT',
    resourceId: '/common/user/update-current-user',
    extraOptions: {},
    resourceType: 'User',
    isSuperUser: false,
  },
  {
    name: 'Update Current User Password',
    method: 'PUT',
    resourceId: '/common/user/change-password',
    extraOptions: {},
    resourceType: 'User',
    isSuperUser: false,
  },
  {
    name: 'Update User',
    method: 'PUT',
    resourceId: '/common/user/update/:userId',
    extraOptions: {},
    resourceType: 'User',
    isSuperUser: false,
  },
  {
    name: 'Delete User',
    method: 'DELETE',
    resourceId: '/common/user/delete/:userId',
    extraOptions: {},
    resourceType: 'User',
    isSuperUser: false,
  },
  {
    name: 'List Permission',
    method: 'GET',
    resourceId: '/common/permission/list',
    extraOptions: {},
    resourceType: 'Permission',
    isSuperUser: false,
  },
  {
    name: 'List Role',
    method: 'GET',
    resourceId: '/common/role/list',
    extraOptions: {},
    resourceType: 'Role',
    isSuperUser: false,
  },
  {
    name: 'List Role Permission',
    method: 'GET',
    resourceId: '/common/role/:roleId',
    extraOptions: {},
    resourceType: 'Role',
    isSuperUser: false,
  },
  {
    name: 'Create Role',
    method: 'POST',
    resourceId: '/common/role/create',
    extraOptions: {},
    resourceType: 'Role',
    isSuperUser: false,
  },
  {
    name: 'Update Role',
    method: 'PUT',
    resourceId: '/common/role/update/:roleId',
    extraOptions: {},
    resourceType: 'Role',
    isSuperUser: false,
  },
  {
    name: 'Delete Role',
    method: 'DELETE',
    resourceId: '/common/role/delete/:roleId',
    extraOptions: {},
    resourceType: 'Role',
    isSuperUser: false,
  },
  {
    name: 'Product List',
    method: 'GET',
    resourceId: '/common/product/list',
    extraOptions: {},
    resourceType: 'Product',
    isSuperUser: true,
  },
  {
    name: 'Create Organization',
    method: 'POST',
    resourceId: '/common/organization/create',
    extraOptions: {},
    resourceType: 'Organization',
    isSuperUser: true,
  },
  {
    name: 'Update Organization',
    method: 'PUT',
    resourceId: '/common/organization/update/:organizationId',
    extraOptions: {},
    resourceType: 'Organization',
    isSuperUser: true,
  },
  {
    name: 'Delete Organization',
    method: 'DELETE',
    resourceId: '/common/organization/delete/:organizationId',
    extraOptions: {},
    resourceType: 'Organization',
    isSuperUser: true,
  },
  {
    name: 'Organization List',
    method: 'GET',
    resourceId: '/common/organization/list',
    extraOptions: {},
    resourceType: 'Organization',
    isSuperUser: true,
  },
  {
    name: 'Get Organization',
    method: 'GET',
    resourceId: '/common/organization/:organizationId',
    extraOptions: {},
    resourceType: 'Organization',
    isSuperUser: true,
  },
  {
    name: 'Get Current Organization',
    method: 'GET',
    resourceId: '/common/organization/get-current-organization',
    extraOptions: {},
    resourceType: 'Organization',
    isSuperUser: false,
  },
  {
    name: 'Organization Product Subscription List',
    method: 'GET',
    resourceId: '/common/product-subscription/list',
    extraOptions: {},
    resourceType: 'Product Subscription',
    isSuperUser: true,
  },
];

export async function seedPermissions() {
  for (const perm of permissions) {
    const { method, resourceId } = perm;

    const existing = await Permission.findOne({ method, resourceId });

    if (!existing) {
      const newPermission = new Permission({
        ...perm,
        status: 'active',
        extraOptions: perm.extraOptions || {},
      });

      await newPermission.save();
      console.info(`✅ Permission "${perm.name}" created.`);
    } else {
      console.info(`ℹ️ Permission "${perm.name}" already exists.`);
    }
  }
}
