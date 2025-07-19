/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';

import * as userService from '../../../database/services/common/user.service';

import { comparePassword, hashPassword } from '../../../utils/bcrypt.utils';
import { Role, RoleId } from '../../../enums/role.enum';
import { IUser } from '../../../database/models/common/user';
import * as authService from '../../../database/services/common/user.service';
import * as organizationProductSubscriptionService from '../../../database/services/common/organizationProductSubscription.services';

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { email, password, moblie, organizationId, firstName, lastName, roleIds, organizationProductSubscriptionIds } =
      req.body;
    const { isSuperUser } = req.user;
    let createUserOrganizationId = req.user.organizationId;
    if (isSuperUser && organizationId) {
      createUserOrganizationId = organizationId;
    }

    // Step 1: Check for existing user
    const existingUser = await authService.findUserByEmail(email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const subscriptionIds = organizationProductSubscriptionIds.map((id) => new Types.ObjectId(id));
    if (subscriptionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User must be assigned to at least one product subscription.',
      });
    } else {
      // Step 2.1: Fetch active users with these subscriptions
      const activeUsers = await userService.findUser({
        createUserOrganizationId,
        status: 'active',
        organizationProductSubscriptionIds: { $in: organizationProductSubscriptionIds },
      });

      // Step 2.2: Build a usage count map
      const usageMap: Record<string, number> = {};
      for (const id of organizationProductSubscriptionIds) {
        usageMap[id] = activeUsers.filter((user) =>
          user?.organizationProductSubscriptionIds?.map(String).includes(String(id))
        ).length;
      }

      // Step 2.3: Fetch subscriptions and validate
      const subscriptions: any = await organizationProductSubscriptionService.findOrganizationProductSubscription(
        {
          _id: { $in: organizationProductSubscriptionIds },
          createUserOrganizationId,
        },
        ['productId']
      );

      const now = new Date();
      const overLimitProducts: string[] = [];
      const expiredProducts: string[] = [];
      const inactiveProducts: string[] = [];

      for (const sub of subscriptions) {
        const subId = sub._id.toString();
        const productName = sub.productId?.name || 'Unknown Product';
        const currentCount = usageMap[subId] || 0;

        if (sub.status !== 'active') {
          inactiveProducts.push(productName);
        }

        if (sub.licenseExpiresAt < now) {
          expiredProducts.push(productName);
        }

        if (currentCount + 1 > sub.totalLicenses) {
          overLimitProducts.push(productName);
        }
      }

      if (inactiveProducts.length || expiredProducts.length || overLimitProducts.length) {
        const messageParts: string[] = [];

        if (inactiveProducts.length) messageParts.push(`Inactive products: ${inactiveProducts.join(', ')}`);
        if (expiredProducts.length) messageParts.push(`Expired licenses: ${expiredProducts.join(', ')}`);
        if (overLimitProducts.length) messageParts.push(`License limit exceeded for: ${overLimitProducts.join(', ')}`);

        return res.status(400).json({
          success: false,
          message: `User creation failed: ${messageParts.join(' | ')}`,
        });
      }
    }

    // Step 3: Create user
    const hashedPassword = await hashPassword(password);

    await authService.createUser({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      roleIds,
      moblie,
      organizationId: createUserOrganizationId,
      status: 'active',
      isVerified: true,
      organizationProductSubscriptionIds,
    });

    return res.status(201).json({ success: true, message: 'User created successfully' });
  } catch (err) {
    next(err);
  }
};
export const getUserList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, organizationId }: any = req.query;
    const { userId, isSuperUser } = req.user;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const query: any = {};
    if (search) query.name = { $regex: search, $options: 'i' };

    if (organizationId && isSuperUser) {
      query.organizationId = new Types.ObjectId(organizationId);
    } else {
      query.organizationId = new Types.ObjectId(req.user.organizationId);
    }

    const { data, totalCount } = await userService.getAllUsers({
      query,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data,
      totalCount,
    });
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user;

    const user = await userService.findUserById(userId, [
      { path: 'organizationId', select: 'id name code status' },
      'roleIds',
      {
        path: 'organizationProductSubscriptionIds',
        populate: { path: 'productId', select: 'name code status' }, // 👈 nested population
      },
    ]);
    res.status(200).json({
      success: true,
      message: 'User fetched successfully',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

export const adminGetUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { organizationId, isSuperUser } = req.user;
    const query = { _id: userId };
    if (!isSuperUser) {
      query['organizationId'] = organizationId;
    }

    const user = await userService.findOne(new Types.ObjectId(userId), [
      { path: 'organizationId', select: 'id name code status' },
      'roleIds',
      {
        path: 'organizationProductSubscriptionIds',
        populate: { path: 'productId', select: 'name code status' }, // 👈 nested population
      },
    ]);

    res.status(200).json({
      success: true,
      message: 'User fetched successfully',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { userId } = req.user;

//     const { firstName, lastName, password } = req.body;

//     const user = (await userService.findUserById(userId)).toJSON();

//     const updateUser: any = {
//       ...(firstName && { firstName }),
//       ...(lastName && { lastName }),
//       ...(password && { password: await hashPassword(password) }),
//     };

//     await userService.updateUser(userId, updateUser);
//     res.status(200).json({ success: true, message: 'User updated successfully' });
//   } catch (err) {
//     next(err);
//   }
// };

// export const adminUpdateUser = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { userId } = req.params;

//     const { email, firstName, lastName, roleId, password, organizationId } = req.body;

//     const user = (await userService.findUserById(userId)).toJSON();

//     const updateUser = {
//       ...(email && { email }),
//       ...(firstName && { firstName }),
//       ...(lastName && { lastName }),
//       ...(password && { password: await hashPassword(password) }),
//       ...(roleId && { role: Role.Labels[roleId] }),
//       ...(roleId && { roleId }),
//       ...(organizationId && { organizationId }),
//     };

//     await userService.updateUser(userId, updateUser);
//     res.status(200).json({ success: true, message: 'User updated successfully' });
//   } catch (err) {
//     next(err);
//   }
// };

// export const updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { userId } = req.params;
//     const { status } = req.body;
//     const { roleId, organizationId, userId: currentUserId } = req.user;

//     if (userId === currentUserId) {
//       return res.status(400).json({ success: false, message: 'Cannot update your own status' });
//     }

//     const query: any = { _id: userId };
//     if (roleId === RoleId.ADMIN) {
//       query.organizationId = organizationId;
//     }

//     const user = await userService.findOne({ query });
//     if (!user) {
//       return res.status(404).json({ success: false, message: 'User not found' });
//     }

//     if (user.status === status) {
//       return res.status(400).json({
//         success: false,
//         message: `User status is already ${status}`,
//       });
//     }
//     //TODO
//     // const statusCheck = await userService.checkUserStatus(status, user.organizationId.toString());
//     // if (!statusCheck.success) {
//     //   return res.status(400).json({ success: false, message: statusCheck.message });
//     // }

//     await userService.updateUser(userId, { status });
//     res.status(200).json({ success: true, message: 'User status updated successfully' });
//   } catch (err) {
//     next(err);
//   }
// };

// export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { userId } = req.params;

//     const user: IUser = await userService.findUserById(userId);

//     if (user && [Role.Id.SUPER_ADMIN].includes(Number(user.roleIds))) {
//       return res.status(400).json({ success: false, message: 'Super Admin cannot be deleted' });
//     }

//     await userService.deleteUser(userId);
//     res.status(200).json({ success: true, message: 'User deleted successfully' });
//   } catch (err) {
//     next(err);
//   }
// };

// export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { oldPassword, newPassword } = req.body;
//     const userId = req.user.userId;

//     const user: any = (await userService.findUserById(userId)).toJSON();

//     const isPasswordMatch = await comparePassword(oldPassword, user?.password);

//     if (!isPasswordMatch)
//       return res.status(400).json({
//         success: false,
//         message: 'Current password is invalid',
//       });

//     const hashedNewPassword = await hashPassword(newPassword);

//     user.password = hashedNewPassword;
//     await user.save();

//     return res.status(200).json({ success: true, message: 'Password changed successfully' });
//   } catch (error) {
//     console.error('Error changing password:', error);
//     next(error);
//   }
// };
