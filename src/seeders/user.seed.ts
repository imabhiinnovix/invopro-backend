import User from '../database/models/user';
import { hashPassword } from '../utils/bcrypt.utils';

export async function seedUsers(payload) {
  const reportivixHashedSuperAdminPassword = await hashPassword('superadmin@1234');
  const reportivixHashedAdminPassword = await hashPassword('admin@1234');
  const reportivixHashedTestPassword = await hashPassword('test@1234');

  // Check if the Super Admin User already exists
  const existingSuperAdminUser = await User.findById(payload.reportivixSuperAdminUserId);

  if (!existingSuperAdminUser) {
    const superAdminUser = new User({
      _id: payload.reportivixSuperAdminUserId,
      email: 'superadmin@reportivix.com',
      password: reportivixHashedSuperAdminPassword,
      firstName: 'Super Admin',
      lastName: 'User',
      role: 'super admin',
      roleId: 1,
      organizationId: payload.reportivixOrganizationId,
      lastLogin: null,
      status: 'active',
      createdAt: new Date('2024-08-07'),
      updatedAt: new Date('2024-08-07'),
    });

    await superAdminUser.save();
    console.info('Super Admin created successfully.');
  }

  // Check if the Admin User already exists
  const existingAdminUser = await User.findById(payload.reportivixAdminUserId);

  if (!existingAdminUser) {
    const adminUser = new User({
      _id: payload.reportivixAdminUserId,
      email: 'admin@reportivix.com',
      password: reportivixHashedAdminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      roleId: 2,
      organizationId: payload.reportivixOrganizationId,
      lastLogin: null,
      status: 'active',
      createdAt: new Date('2024-08-08'),
      updatedAt: new Date('2024-08-08'),
    });

    await adminUser.save();
    console.info('Admin created successfully.');
  }

  // Check if the Test User already exists
  const existingTestUser = await User.findById(payload.reportivixTestUserId);

  if (!existingTestUser) {
    const testUser = new User({
      _id: payload.reportivixTestUserId,
      email: 'test@reportivix.com',
      password: reportivixHashedTestPassword,
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      roleId: 3,
      organizationId: payload.reportivixOrganizationId,
      lastLogin: null,
      status: 'active',
      createdAt: new Date('2024-08-09'),
      updatedAt: new Date('2024-08-09'),
    });

    await testUser.save();
    console.info('Test User created successfully.');
  }

  //sabic user
  // Check if the Admin User already exists
  const existingSabicAdminUser = await User.findById(payload.sabicAdminUserId);
  const sabicHashedAdminPassword = await hashPassword('Sabic@1234');
  if (!existingSabicAdminUser) {
    const sabicAdminUser = new User({
      _id: payload.sabicAdminUserId,
      email: 'cs.sabic@innovix-labs.com',
      password: sabicHashedAdminPassword,
      firstName: 'Sabic',
      lastName: 'Admin',
      role: 'admin',
      roleId: 2,
      organizationId: payload.sabicOrganizationId,
      lastLogin: null,
      status: 'active',
      createdAt: new Date('2024-08-08'),
      updatedAt: new Date('2024-08-08'),
    });

    await sabicAdminUser.save();
    console.info('Sabic Admin created successfully.');
  }
  const existingSabicAdminMahuaUser = await User.findById(payload.mahuaAdminUserId);
  const sabicHashedAdminMahuaPassword = await hashPassword('Sabic@1234');
  if (!existingSabicAdminMahuaUser) {
    const sabicMahuaAdminUser = new User({
      _id: payload.mahuaAdminUserId,
      email: 'mahua.dutta@sabic.com',
      password: sabicHashedAdminMahuaPassword,
      firstName: 'Mahua',
      lastName: 'Dutta',
      role: 'admin',
      roleId: 2,
      organizationId: payload.sabicOrganizationId,
      lastLogin: null,
      status: 'active',
      createdAt: new Date('2024-08-08'),
      updatedAt: new Date('2024-08-08'),
    });

    await sabicMahuaAdminUser.save();
    console.info('Sabic Mahua Admin created successfully.');
  }
}
