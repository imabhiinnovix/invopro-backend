import User from '../database/models/user';
import { hashPassword } from '../utils/bcrypt.utils';

export async function seedUsers(payload) {
  const hashedSuperAdminPassword = await hashPassword('superadmin@1234');
  const hashedAdminPassword = await hashPassword('admin@1234');
  const hashedTestPassword = await hashPassword('test@1234');

  // Check if the Super Admin User already exists
  const existingSuperAdminUser = await User.findById(payload.superAdminUserId);

  if (!existingSuperAdminUser) {
    const superAdminUser = new User({
      _id: payload.superAdminUserId,
      email: 'superadmin@reportivix.com',
      password: hashedSuperAdminPassword,
      firstName: 'Super Admin',
      lastName: 'User',
      role: 'super admin',
      roleId: 1,
      organizationId: payload.organizationId,
      createdAt: new Date('2024-08-07'),
      updatedAt: new Date('2024-08-07'),
    });

    await superAdminUser.save();
    console.info('Super Admin created successfully.');
  }

  // Check if the Admin User already exists
  const existingAdminUser = await User.findById(payload.adminUserId);

  if (!existingAdminUser) {
    const adminUser = new User({
      _id: payload.adminUserId,
      email: 'admin@reportivix.com',
      password: hashedAdminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      roleId: 2,
      organizationId: payload.organizationId,
      createdAt: new Date('2024-08-08'),
      updatedAt: new Date('2024-08-08'),
    });

    await adminUser.save();
    console.info('Admin created successfully.');
  }

  // Check if the Test User already exists
  const existingTestUser = await User.findById(payload.testUserId);

  if (!existingTestUser) {
    const testUser = new User({
      _id: payload.testUserId,
      email: 'test@reportivix.com',
      password: hashedTestPassword,
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      organizationId: payload.organizationId,
      createdAt: new Date('2024-08-09'),
      updatedAt: new Date('2024-08-09'),
    });

    await testUser.save();
    console.info('Test User created successfully.');
  }

  // Set payload.organizationId for users without it
  const organizationCount = await User.updateMany(
    { organizationId: { $exists: false } },
    { $set: { organizationId: payload.organizationId } },
  );
  console.info(`Updated ${organizationCount.modifiedCount} users with organizationIds.`);

  const updateLastLogin = await User.updateMany({ lastLogin: { $exists: false } }, { $set: { lastLogin: null } });
  console.info(`Updated ${updateLastLogin.modifiedCount} users with lastLogin.`);

  const adminRole = await User.updateMany({ role: 'admin', roleId: 1 }, { $set: { roleId: 2 } });
  console.info(`Updated ${adminRole.modifiedCount} users with admin roleIds`);

  const userRole = await User.updateMany({ role: 'user', roleId: 2 }, { $set: { roleId: 3 } });
  console.info(`Updated ${userRole.modifiedCount} users with user roleIds`);

  const updateStatus = await User.updateMany({ status: { $exists: false } }, { $set: { status: 'active' } });
  console.info(`Updated ${updateStatus.modifiedCount} users with status.`);
}
