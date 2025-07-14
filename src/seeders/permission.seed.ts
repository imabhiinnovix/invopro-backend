import Permission from '../database/models/permissionModel'; // Your Mongoose model

const permissions = [
  { name: 'Create User', method: 'POST', resource: '/common/user/create', extraOptions: {} },
  { name: 'List User', method: 'GET', resource: '/common/user/list', extraOptions: {} },
  { name: 'Get User', method: 'GET', resource: '/common/user/:userId' },
  { name: 'Get Current User', method: 'GET', resource: '/common/user/getCurrentUser', extraOptions: {} },
  { name: 'Update Self User', method: 'PUT', resource: '/common/user/update', extraOptions: {} },
  { name: 'Update User', method: 'PUT', resource: '/common/user/update/:userId', extraOptions: {} },
  { name: 'Delete User', method: 'DELETE', resource: '/common/user/delete/:userId', extraOptions: {} },
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
