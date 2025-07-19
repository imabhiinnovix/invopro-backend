/* eslint-disable @typescript-eslint/no-explicit-any */
import { RoleId } from '../../../enums/role.enum';
import User from '../../models/common/user';
import * as organizationService from './organization.service';
import { PopulateOptions } from 'mongoose';

export const getAllUsers = async ({ query, select = '', page, limit, sort = { createdAt: -1 }, populate }: any) => {
  try {
    let usersQuery = User.find(query)
      .select(select + ' -password')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        usersQuery = usersQuery.populate(field);
      });
    }

    const users = await usersQuery.exec();

    const totalCount = await User.countDocuments(query);

    return { data: users, totalCount };
  } catch (err) {
    throw err;
  }
};

export const createUser = async (userData: any) => {
  try {
    const user = new User(userData);
    await user.save();
    return user;
  } catch (err) {
    throw err;
  }
};

export const findUser = async (userQuery, populateFields: (string | PopulateOptions)[] = []) => {
  let query = User.find(userQuery);
  populateFields.forEach((field) => {
    const pop: PopulateOptions = typeof field === 'string' ? { path: field } : field;
    query = query.populate(pop);
  });

  const user = await query;
  return user;
};

export const findUserByEmail = async (email: string, populateFields: (string | PopulateOptions)[] = []) => {
  try {
    let query = User.findOne({ email });

    // Normalize and apply population
    populateFields.forEach((field) => {
      const pop: PopulateOptions = typeof field === 'string' ? { path: field } : field;
      query = query.populate(pop);
    });

    const user = await query;
    return user;
  } catch (err) {
    throw err;
  }
};

export const findOne = async (userQuery, populateFields: (string | PopulateOptions)[] = []) => {
  try {
    let query = User.findOne(userQuery).select('-password');
    // Normalize and apply population
    populateFields.forEach((field) => {
      const pop: PopulateOptions = typeof field === 'string' ? { path: field } : field;
      query = query.populate(pop);
    });

    const user = await query;
    return user;
  } catch (err) {
    throw err;
  }
};

export const findUserById = async (
  id: string,
  populateFields: (string | PopulateOptions)[] = [],
  passwordRequired: boolean = false
) => {
  try {
    let query: any = User.findById(id);
    if (!passwordRequired) {
      query = query.select('-password');
    }
    // Normalize and apply population
    populateFields.forEach((field) => {
      const pop: PopulateOptions = typeof field === 'string' ? { path: field } : field;
      query = query.populate(pop);
    });

    const user = await query;
    return user;
  } catch (err) {
    throw err;
  }
};
export const updateUser = async (id: string, userData: any) => {
  try {
    const user = await User.findByIdAndUpdate(id, userData, { new: true });
    return user;
  } catch (err) {
    throw err;
  }
};

export const deleteUser = async (id: string) => {
  try {
    await User.findByIdAndDelete(id);
  } catch (err) {
    throw err;
  }
};

export const userCount = async (query) => {
  try {
    const count = await User.countDocuments(query);
    return count;
  } catch (err) {
    throw err;
  }
};
