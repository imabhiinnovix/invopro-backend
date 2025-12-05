/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction, query } from 'express';
import { Types } from 'mongoose';

import * as userService from '../../../database/services/common/user.service';

import { comparePassword, hashPassword } from '../../../utils/bcrypt.utils';

import * as authService from '../../../database/services/common/user.service';
import * as organizationProductSubscriptionService from '../../../database/services/common/organizationProductSubscription.services';
import { validateUserInput } from '../../../utils/validation.utils';
import * as roleHasPermissionService from '../../../database/services/common/roleHasPermission.services';
import * as permissionService from '../../../database/services/common/permission.service';
import path from 'path';
import fsPromises from 'fs/promises';
import UserRole from '../../../database/models/common/userRole';

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let {
      email,
      password,
      mobile,
      organizationId,
      firstName,
      lastName,
      roleIds,
      organizationProductSubscriptionIds,
      departmentId,
      designationId,
      address,
      country,
      state,
      city,
      postalCode,
    } = req.body;

    const validationResult = validateUserInput({ email, password, firstName, isUpdate: false });

    if (!validationResult.valid) {
      return res.status(400).json({ success: false, message: validationResult.message });
    }
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
      mobile,
      organizationId: createUserOrganizationId,
      status: 'active',
      isVerified: true,
      organizationProductSubscriptionIds,
      departmentId,
      designationId,
      address,
      country,
      state,
      city,
      postalCode,
    });

    return res.status(201).json({ success: true, message: 'User created successfully' });
  } catch (err) {
    next(err);
  }
};
export const getUserList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, firstName, lastName, organizationId }: any = req.query;
    const { userId, isSuperUser } = req.user;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const query: any = {};

    if (typeof email === 'string' && email.trim()) {
      query.email = { $regex: email.trim(), $options: 'i' };
    }

    if (typeof firstName === 'string' && firstName.trim()) {
      query.firstName = { $regex: firstName.trim(), $options: 'i' };
    }

    if (typeof lastName === 'string' && lastName.trim()) {
      query.lastName = { $regex: lastName.trim(), $options: 'i' };
    }

    if (organizationId && isSuperUser) {
      query.organizationId = new Types.ObjectId(organizationId);
    } else {
      query.organizationId = new Types.ObjectId(req.user.organizationId);
    }

    const { data, totalCount } = await userService.getAllUsers({
      query,
      page,
      limit,
      populate: ['roleIds', 'organizationProductSubscriptionIds'],
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
    const { userId, organizationId, isSuperUser } = req.user;

    let user = await userService.findUserById(userId, [
      { path: 'organizationId', select: 'id name code status' },
      'roleIds',
      {
        path: 'organizationProductSubscriptionIds',
        populate: { path: 'productId', select: 'name code status' }, // 👈 nested population
      },
      {
        path: 'departmentId',
        select: 'name', // 👈 nested population
      },
      {
        path: 'designationId',
        select: 'name', // 👈 nested population
      },
    ]);

    const roleIds = Array.isArray(user.roleIds)
      ? user.roleIds.map((role: any) => (typeof role === 'object' && role !== null ? role._id : role))
      : [];

    user = user.toObject();
    if (user?.imagePath) {
      user.imagePath = `${process.env.BASE_BACKEND_URL}/${user.imagePath}`;
    }
    const permissionDetails = await roleHasPermissionService.getPermissionsByRoleIds(roleIds);
    const query: any = {
      isChangeable: true,
      $or: [{ organizationId: { $exists: false } }, { organizationId: new Types.ObjectId(organizationId) }],
    };
    if(!isSuperUser){
      query.isSuperUser = false;
    }
    let allPermissionResult = await permissionService.getPermissionList({
      query,
      page: 1,
      limit: 0,
      populate: ['dataSourceId'],
    });

    const allowedMap: Record<string, any> = {};
    permissionDetails.forEach((perm) => {
      allowedMap[perm.permissionId.toString()] = perm;
    });

    const allPermissionsWithAccess = allPermissionResult.data.map((perm: any) => {
      const matched = allowedMap[perm._id.toString()];

      if (matched) {
        return {
          ...matched,
          allowed: true,
        };
      } else {
        return {
          ...perm.toObject(),
          permissionId: perm._id,
          allowed: false,
        };
      }
    });

    user['permissionIds'] = allPermissionsWithAccess;
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

export const updateCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user;

    const { firstName, lastName, mobile, address, country, state, city, postalCode } = req.body;
    const validationResult = validateUserInput({ firstName, isUpdate: true });

    if (!validationResult.valid) {
      return res.status(400).json({ success: false, message: validationResult.message });
    }

    const updateUser: any = {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(mobile && { mobile }),
      ...(address && { address }),
      ...(country && { country }),
      ...(state && { state }),
      ...(city && { city }),
      ...(postalCode && { postalCode }),
    };

    await userService.updateUser(userId, updateUser);
    res.status(200).json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    next(err);
  }
};

export const adminUpdateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    const {
      firstName,
      lastName,
      mobile,
      roleIds,
      status,
      password,
      organizationProductSubscriptionIds,
      organizationId: bodyOrgId,
      departmentId,
      designationId,
      address,
      country,
      state,
      city,
      postalCode,
    } = req.body;

    const validationResult = validateUserInput({ firstName, password, isUpdate: true });

    if (!validationResult.valid) {
      return res.status(400).json({ success: false, message: validationResult.message });
    }

    if (status && !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid User Status.`,
      });
    }
    const { isSuperUser } = req.user;
    let organizationId = req.user.organizationId;

    // If super user and orgId is passed in body
    if (isSuperUser && bodyOrgId) {
      organizationId = bodyOrgId;
    }

    const userQuery = { _id: new Types.ObjectId(userId), organizationId: new Types.ObjectId(organizationId) };
    // Step 1: Fetch existing user
    const existingUser = await userService.findOne(userQuery);

    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const oldStatus = existingUser.status;
    const newStatus = status || oldStatus;
    const newSubscriptionIds: string[] =
      organizationProductSubscriptionIds ?? existingUser.organizationProductSubscriptionIds?.map(String) ?? [];

    if (newStatus === 'active') {
      const subscriptionIds = newSubscriptionIds.map((id) => new Types.ObjectId(id));

      // Find active users excluding current
      const activeUsers = await userService.findUser({
        _id: { $ne: userId },
        organizationId,
        status: 'active',
        organizationProductSubscriptionIds: { $in: subscriptionIds },
      });

      // Build usage map
      const usageMap: Record<string, number> = {};
      for (const id of newSubscriptionIds) {
        usageMap[id] = activeUsers.filter((user) =>
          user?.organizationProductSubscriptionIds?.map(String).includes(String(id))
        ).length;
      }

      // Fetch and validate subscriptions
      const subscriptions: any[] = await organizationProductSubscriptionService.findOrganizationProductSubscription(
        { _id: { $in: subscriptionIds }, organizationId },
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

        if (sub.status !== 'active') inactiveProducts.push(productName);
        if (sub.licenseExpiresAt < now) expiredProducts.push(productName);
        if (currentCount + 1 > sub.totalLicenses) overLimitProducts.push(productName);
      }

      if (inactiveProducts.length || expiredProducts.length || overLimitProducts.length) {
        const messageParts: string[] = [];

        if (inactiveProducts.length) messageParts.push(`Inactive products: ${inactiveProducts.join(', ')}`);
        if (expiredProducts.length) messageParts.push(`Expired licenses: ${expiredProducts.join(', ')}`);
        if (overLimitProducts.length) messageParts.push(`License limit exceeded for: ${overLimitProducts.join(', ')}`);

        return res.status(400).json({
          success: false,
          message: `User update failed: ${messageParts.join(' | ')}`,
        });
      }
    }

    // Step 2: Build update object
    const updateData: any = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (mobile) updateData.mobile = mobile;
    if (roleIds) updateData.roleIds = roleIds;
    if (status) updateData.status = status;
    if (password) updateData.password = await hashPassword(password);
    if (organizationProductSubscriptionIds)
      updateData.organizationProductSubscriptionIds = organizationProductSubscriptionIds;
    if (departmentId) {
      updateData.departmentId = departmentId;
    }
    if (designationId) {
      updateData.designationId = designationId;
    }
    if (address) {
      updateData.address = address;
    }
    if (country) {
      updateData.country = country;
    }
    if (state) {
      updateData.state = state;
    }
    if (city) {
      updateData.city = city;
    }
    if (postalCode) {
      updateData.postalCode = postalCode;
    }
    // Step 3: Update user
    await userService.updateUser(userId, updateData);

    return res.status(200).json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { isSuperUser } = req.user;
    let organizationId = req.user.organizationId;
    const { organizationId: bodyOrgId } = req.body;

    if (isSuperUser && bodyOrgId) {
      organizationId = bodyOrgId;
    }
    const user = await userService.findOne({
      _id: new Types.ObjectId(userId),
      organizationId: new Types.ObjectId(organizationId),
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await userService.deleteUser(userId);
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(404).json({ success: false, message: 'Password is required.' });
    }
    const validationResult = validateUserInput({ password: newPassword, isUpdate: true });

    if (!validationResult.valid) {
      return res.status(400).json({ success: false, message: validationResult.message });
    }
    const userId = req.user.userId;

    const user: any = await userService.findUserById(userId, [], true);

    const isPasswordMatch = await comparePassword(oldPassword, user?.password);

    if (!isPasswordMatch)
      return res.status(400).json({
        success: false,
        message: 'Current password is invalid',
      });

    const hashedNewPassword = await hashPassword(newPassword);

    user.password = hashedNewPassword;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    next(error);
  }
};

export async function createUpdateCurrentUserProfileImage(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, organizationId } = req?.user;

    // ensure files exist
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat();

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    // take the first file (profile pic)
    const file = files[0] as Express.Multer.File;

    // get extension
    const ext = path.extname(file.originalname) || '.jpg';

    // build target path: uploads/<organizationId>/<userId>.<ext>
    const newFilePath = path.join('uploads', organizationId.toString(), userId.toString(), `${userId}${ext}`);

    // create directory if not exists
    await fsPromises.mkdir(path.dirname(newFilePath), { recursive: true });

    // move file from multer temp to target location
    await fsPromises.rename(file.path, newFilePath);

    await userService.updateUser(userId, { imagePath: newFilePath });
    return res.json({
      success: true,
      message: 'Profile image updated successfully.',
      data: {
        imagePath: newFilePath,
      },
    });
  } catch (e) {
    next(e);
  }
}

export async function getCurrentUserProfileImage(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req?.user;

    // Fetch user from DB to get imagePath
    const user = await userService.findUserById(userId);
    if (!user || !user.imagePath) {
      return res.status(404).json({ success: false, message: 'Profile image not found' });
    }

    const imagePath = path.resolve(user.imagePath);

    // Check if file exists asynchronously
    try {
      await fsPromises.access(imagePath);
    } catch {
      return res.status(404).json({ success: false, message: 'Image file not found' });
    }

    // Send file using res.sendFile
    res.sendFile(imagePath, (err) => {
      if (err) {
        console.error('Error sending image:', err);
        return res.status(500).json({ success: false, message: 'Error sending image file' });
      }
    });
  } catch (err) {
    console.error('Error fetching profile image:', err);
    return res.status(500).json({ success: false, message: 'Unable to fetch profile image' });
  }
}

export const deleteCurrentUserProfileImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.userId;
    const user = await userService.findUserById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Optionally delete the file if exists
    if (user.imagePath) {
      try {
        await fsPromises.unlink(user.imagePath); // delete file
      } catch {
        // ignore errors if file doesn't exist
      }
    }

    // Update DB to remove image path
    user.imagePath = '';
    await user.save();

    return res.status(200).json({ success: true, message: 'Profile image deleted successfully' });
  } catch (err) {
    console.error('Error deleting profile image:', err);
    return res.status(500).json({ success: false, message: 'Unable to delete profile image' });
  }
};
