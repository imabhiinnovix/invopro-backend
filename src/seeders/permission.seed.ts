import Permission from '../database/models/common/permissionModel'; // Your Mongoose model

const permissions = [
  { name: 'List User', method: 'GET', resourceId: '/common/user/list', extraOptions: {}, resourceType: 'User' },
  {
    name: 'Get Current User',
    method: 'GET',
    resourceId: '/common/user/get-current-user',
    extraOptions: {},
    resourceType: 'User',
  },
  { name: 'Get User', method: 'GET', resourceId: '/common/user/:userId', resourceType: 'User' },
  { name: 'Create User', method: 'POST', resourceId: '/common/user/create', extraOptions: {}, resourceType: 'User' },
  {
    name: 'Update Current User',
    method: 'PUT',
    resourceId: '/common/user/update-current-user',
    extraOptions: {},
    resourceType: 'User',
  },
  {
    name: 'Update Current User Password',
    method: 'PUT',
    resourceId: '/common/user/change-password',
    extraOptions: {},
    resourceType: 'User',
  },
  {
    name: 'Update User',
    method: 'PUT',
    resourceId: '/common/user/update/:userId',
    extraOptions: {},
    resourceType: 'User',
  },
  {
    name: 'Delete User',
    method: 'DELETE',
    resourceId: '/common/user/delete/:userId',
    extraOptions: {},
    resourceType: 'User',
  },
  {
    name: 'List Permission',
    method: 'GET',
    resourceId: '/common/permission/list',
    extraOptions: {},
    resourceType: 'Permission',
  },
  {
    name: 'List Role',
    method: 'GET',
    resourceId: '/common/role/list',
    extraOptions: {},
    resourceType: 'Role',
  },
  {
    name: 'List Role Permission',
    method: 'GET',
    resourceId: '/common/role/:roleId',
    extraOptions: {},
    resourceType: 'Role',
  },
  {
    name: 'Create Role',
    method: 'POST',
    resourceId: '/common/role',
    extraOptions: {},
    resourceType: 'Role',
  },
  {
    name: 'Update Role',
    method: 'PUT',
    resourceId: '/common/role/update/:roleId',
    extraOptions: {},
    resourceType: 'Role',
  },
  {
    name: 'Delete Role',
    method: 'DELETE',
    resourceId: '/common/role/delete/:roleId',
    extraOptions: {},
    resourceType: 'Role',
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
