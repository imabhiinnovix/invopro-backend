/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import User from '../database/models/common/user';
import UserRole from '../database/models/common/userRole';
import Organization from '../database/models/common/organization';
import OrganizationProductSubscription from '../database/models/common/organizationProductSubscription';
import { hashPassword } from '../utils/bcrypt.utils';
import { Types } from 'mongoose';

interface UserSeedData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  type: 'superadmin' | 'admin' | 'user';
  customId?: Types.ObjectId; // optional _id
}

interface OrganizationSeedPayload {
  organizationId: Types.ObjectId;
  isMaster: boolean;
  users: UserSeedData[];
}

export async function seedUsers(payload: OrganizationSeedPayload[]) {
  const roleMap = new Map<string, any>(); // Cache roles

  for (const org of payload) {
    const orgId = org.organizationId;

    // Fetch all product subscriptions for the org
    const subscriptions = await OrganizationProductSubscription.find({
      organizationId: orgId,
      status: 'active',
    });

    const subscriptionIds = subscriptions.map((sub) => sub._id);

    // Create roles for this organization
    const rolesToCreate = org.isMaster ? ['Super Admin', 'Admin', 'User'] : ['Admin', 'User'];

    for (const roleName of rolesToCreate) {
      let existingRole = await UserRole.findOne({ name: roleName, organizationId: orgId });
      if (!existingRole) {
        existingRole = new UserRole({
          name: roleName,
          organizationId: orgId,
          isSuperUser: roleName === 'Super Admin',
          status: 'active',
        });
        await existingRole.save();
        console.info(`✅ Role "${roleName}" created for Org ${orgId}`);
      } else {
        console.info(`ℹ️ Role "${roleName}" already exists for Org ${orgId}`);
      }
      roleMap.set(`${orgId}_${roleName}`, existingRole);
    }

    // Create users
    for (const user of org.users) {
      const existingUser = await User.findOne({ email: user.email });

      if (existingUser) {
        if (existingUser.get('role')) {
          await User.findByIdAndDelete(existingUser._id);
          console.info(`🗑️ Deleted existing user "${existingUser.firstName}" with role.`);
        } else {
          console.info(`ℹ️ User "${existingUser.firstName}" already exists.`);
          continue;
        }
      }

      const hashedPassword = await hashPassword(user.password);

      const roleKey = `${orgId}_${getRoleName(user.type)}`;
      const userRole = roleMap.get(roleKey);
      if (!userRole) {
        console.warn(`⚠️ Role not found for ${roleKey}`);
        continue;
      }

      const newUser = new User({
        _id: user.customId ? new Types.ObjectId(user.customId) : undefined,
        email: user.email,
        password: hashedPassword,
        firstName: user.firstName,
        lastName: user.lastName,
        roleIds: [userRole._id],
        organizationId: orgId,
        organizationProductSubscriptionIds: subscriptionIds,
        status: 'active',
        isVerified: true,
      });

      await newUser.save();
      console.info(`✅ Created user: ${user.email}`);
    }
  }
}

// Helper
function getRoleName(type: 'superadmin' | 'admin' | 'user'): string {
  switch (type) {
    case 'superadmin':
      return 'Super Admin';
    case 'admin':
      return 'Admin';
    case 'user':
    default:
      return 'User';
  }
}
