import Permission from '../database/models/permissionModel'; // Your Mongoose model

const permissions = [
  { name: 'Create User', method: 'POST', resourceId: '/common/user/create', extraOptions: {}, resourceType: 'User' },
  { name: 'List User', method: 'GET', resourceId: '/common/user/list', extraOptions: {}, resourceType: 'User' },
  { name: 'Get User', method: 'GET', resource: '/common/user/:userId', resourceType: 'User' },
  {
    name: 'Get Current User',
    method: 'GET',
    resource: '/common/user/getCurrentUser',
    extraOptions: {},
    resourceType: 'User',
  },
  { name: 'Update Self User', method: 'PUT', resource: '/common/user/update', extraOptions: {}, resourceType: 'User' },
  {
    name: 'Update User',
    method: 'PUT',
    resource: '/common/user/update/:userId',
    extraOptions: {},
    resourceType: 'User',
  },
  {
    name: 'Delete User',
    method: 'DELETE',
    resource: '/common/user/delete/:userId',
    extraOptions: {},
    resourceType: 'User',
  },
];

export async function seedPermissions() {
  for (const perm of permissions) {
    const { method, resource } = perm;

    const existing = await Permission.findOne({ method, resource });

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
