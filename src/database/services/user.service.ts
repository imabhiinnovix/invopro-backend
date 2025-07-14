/* eslint-disable @typescript-eslint/no-explicit-any */
import { RoleId } from '../../enums/role.enum';
import User from '../models/user';
import * as organizationService from '../../database/services/organization.service';

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

export const findUserByEmail = async (email: string) => {
  try {
    const user = await User.findOne({ email }).populate('organizationId', 'id name code status licenseExpiresAt');
    return user;
  } catch (err) {
    throw err;
  }
};

export const findOne = async ({ query }) => {
  try {
    const user = await User.findOne(query);

    return user;
  } catch (err) {
    throw err;
  }
};

export const findUserById = async (id: string) => {
  try {
    const user = await User.findById(id).populate('organizationId', 'id name');
    if (!user) {
      throw new Error('User not found');
    }

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

export const checkUserStatus = async (
  status: string,
  organizationId: string
): Promise<{ success: boolean; message?: string }> => {
  const organization = await organizationService.getOrganizationById(organizationId);

  if (!organization) {
    return { success: false, message: 'Organization not found' };
  }

  const activeUserCount = await userCount({
    status: 'active',
    organizationId,
    roleId: { $ne: RoleId.SUPER_ADMIN },
  });

  // switch (status) {
  //   case 'active':
  //     if (activeUserCount >= organization.totalLicenses) {
  //       return { success: false, message: 'License limit reached. Please contact the support team.' };
  //     }
  //     break;
  //   case 'inactive':
  //     if (activeUserCount < 1) {
  //       return { success: false, message: 'No active licenses to revoke.' };
  //     }
  //     break;
  //   default:
  //     return { success: false, message: 'Invalid status value provided.' };
  // }

  return { success: true };
};

export const userAggregate = async (options) => {
  const { query, page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  try {
    const data = await User.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },

      // Lookup files associated with the user and group them by type, including totalSize for each type
      {
        $lookup: {
          from: 'files',
          let: { userId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$userId', '$$userId'] } } },
            {
              $project: {
                type: {
                  $switch: {
                    branches: [
                      { case: { $in: ['$type', ['xlsx', 'xls', 'csv']] }, then: 'excel' },
                      { case: { $in: ['$type', ['docx', 'doc']] }, then: 'word' },
                    ],
                    default: '$type',
                  },
                },
                size: 1,
              },
            },
            { $group: { _id: '$type', count: { $sum: 1 }, totalSize: { $sum: '$size' } } },
          ],
          as: 'fileTypeBreakdown',
        },
      },

      // Lookup organization details
      {
        $lookup: {
          from: 'organizations',
          localField: 'organizationId',
          foreignField: '_id',
          as: 'organizationDetails',
        },
      },
      { $unwind: { path: '$organizationDetails', preserveNullAndEmptyArrays: true } },

      // Count the total workspaces associated with the user
      {
        $lookup: {
          from: 'workspaces',
          let: { userId: '$_id' },
          pipeline: [{ $match: { $expr: { $eq: ['$userId', '$$userId'] } } }, { $count: 'totalWorkspaceCount' }],
          as: 'workspaceCount',
        },
      },

      // Add computed fields for total files, workspace count, file breakdown, and total file size used
      {
        $addFields: {
          totalFileCount: { $sum: '$fileTypeBreakdown.count' },
          totalWorkspaceCount: {
            $ifNull: [{ $arrayElemAt: ['$workspaceCount.totalWorkspaceCount', 0] }, 0],
          },
          fileTypeBreakdown: {
            $arrayToObject: {
              $map: {
                input: '$fileTypeBreakdown',
                as: 'item',
                in: { k: '$$item._id', v: { count: '$$item.count', totalSize: '$$item.totalSize' } },
              },
            },
          },
          totalSpaceUsed: { $sum: '$fileTypeBreakdown.totalSize' },
        },
      },

      // Calculate average files per workspace
      {
        $addFields: {
          averageFilesPerWorkspace: {
            $cond: {
              if: { $gt: ['$totalWorkspaceCount', 0] },
              then: { $round: [{ $divide: ['$totalFileCount', '$totalWorkspaceCount'] }, 2] },
              else: 0,
            },
          },
        },
      },

      // Select specific fields to return in the final result
      {
        $project: {
          email: 1,
          firstName: 1,
          lastName: 1,
          status: 1,
          role: 1,
          roleId: 1,
          lastLogin: 1,
          createdAt: 1,
          updatedAt: 1,
          lastWorkspaceId: 1,
          fileTypeBreakdown: 1,
          totalFileCount: 1,
          totalWorkspaceCount: 1,
          averageFilesPerWorkspace: 1,
          totalSpaceUsed: 1,
          organizationId: {
            _id: '$organizationDetails._id',
            name: '$organizationDetails.name',
          },
        },
      },
    ]);

    const totalCount = await User.countDocuments(query);

    return { data, totalCount };
  } catch (error) {
    console.error('Error in userAggregate:', error);
    throw new Error('Failed to aggregate user data');
  }
};
