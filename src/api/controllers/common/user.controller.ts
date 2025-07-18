/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';

import * as userService from '../../../database/services/common/user.service';

import { comparePassword, hashPassword } from '../../../utils/bcrypt.utils';
import { Role, RoleId } from '../../../enums/role.enum';
import { IUser } from '../../../database/models/common/user';
import * as authService from '../../../database/services/common/user.service';

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, roleIds, status } = req.body;
    const { userId, organizationId } = req.user;

    const existingUser = await authService.findUserByEmail(email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const hashedPassword = await hashPassword(password);

    const user: IUser = await authService.createUser({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      organizationId,
      status: 'active',
      // ...(roleId && { role: Role.Labels[roleId] || Role.Labels[Role.Id.USER] }),
      // ...(roleId && { roleId }),
    });

    res.status(201).json({ success: true, message: 'User created successfully' });
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

    const user = await userService.findUserById(userId);
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

    const user = await userService.findUserById(userId);
    res.status(200).json({
      success: true,
      message: 'User fetched successfully',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user;

    const { firstName, lastName, password } = req.body;

    const user = (await userService.findUserById(userId)).toJSON();

    const updateUser: any = {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(password && { password: await hashPassword(password) }),
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

    const { email, firstName, lastName, roleId, password, organizationId } = req.body;

    const user = (await userService.findUserById(userId)).toJSON();

    const updateUser = {
      ...(email && { email }),
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(password && { password: await hashPassword(password) }),
      ...(roleId && { role: Role.Labels[roleId] }),
      ...(roleId && { roleId }),
      ...(organizationId && { organizationId }),
    };

    await userService.updateUser(userId, updateUser);
    res.status(200).json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    next(err);
  }
};

export const updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    const { roleId, organizationId, userId: currentUserId } = req.user;

    if (userId === currentUserId) {
      return res.status(400).json({ success: false, message: 'Cannot update your own status' });
    }

    const query: any = { _id: userId };
    if (roleId === RoleId.ADMIN) {
      query.organizationId = organizationId;
    }

    const user = await userService.findOne({ query });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.status === status) {
      return res.status(400).json({
        success: false,
        message: `User status is already ${status}`,
      });
    }
    //TODO
    // const statusCheck = await userService.checkUserStatus(status, user.organizationId.toString());
    // if (!statusCheck.success) {
    //   return res.status(400).json({ success: false, message: statusCheck.message });
    // }

    await userService.updateUser(userId, { status });
    res.status(200).json({ success: true, message: 'User status updated successfully' });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    const user: IUser = await userService.findUserById(userId);

    if (user && [Role.Id.SUPER_ADMIN].includes(Number(user.roleIds))) {
      return res.status(400).json({ success: false, message: 'Super Admin cannot be deleted' });
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
    const userId = req.user.userId;

    const user: any = (await userService.findUserById(userId)).toJSON();

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
