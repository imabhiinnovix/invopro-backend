/* eslint-disable @typescript-eslint/no-explicit-any */
import Organization from '../models/organization';

export const createOrganization = async (organizationData: any) => {
  try {
    const organization = new Organization(organizationData);
    await organization.save();
    return organization;
  } catch (err) {
    throw err;
  }
};

export const getOrganizationById = async (organizationId: string) => {
  try {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new Error('Organization not found');
    }
    return organization;
  } catch (err) {
    throw err;
  }
};

export const updateOrganization = async (organizationId: string, organizationData: any) => {
  try {
    const organization = await Organization.findByIdAndUpdate(organizationId, organizationData, { new: true });
    return organization;
  } catch (err) {
    throw err;
  }
};

export const deleteOrganization = async (organizationId: string) => {
  try {
    await Organization.findByIdAndDelete(organizationId);
  } catch (err) {
    throw err;
  }
};

export const getOrganizationList = async ({
  query,
  select = '',
  page,
  limit,
  sort = { createdAt: -1 },
  populate,
}: any) => {
  try {
    // Remove the await keyword here
    let usersQuery: any = Organization.find(query)
      .select(select + ' -password -isMaster')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        usersQuery = usersQuery.populate(field);
      });
    }

    // Now await the final query execution
    const organizations = await usersQuery.exec();

    const totalCount = await Organization.countDocuments(query);

    return { data: organizations, totalCount };
  } catch (err) {
    throw err;
  }
};

export const getOrganizationByUser = async (userId: string) => {
  try {
    const organizations = await Organization.find({ owner: userId });
    return organizations;
  } catch (err) {
    throw err;
  }
};

export const organizationAggregate = async (options) => {
  const { query, page, limit } = options;
  const skip = (page - 1) * limit;

  // Calculate the date one month ago from today
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  console.log('oneMonthAgo :>> ', oneMonthAgo);

  const data = await Organization.aggregate([
    { $match: query },
    { $sort: { createdAt: -1 } },
    ...(page && limit ? [{ $skip: skip }, { $limit: limit }] : []),

    // Lookup to count total workspaces for each organization
    {
      $lookup: {
        from: 'workspaces',
        let: { organizationId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$organizationId', '$$organizationId'] } } },
          { $count: 'totalWorkspaceCount' },
        ],
        as: 'workspaceCount',
      },
    },

    // Lookup to get users and their file breakdowns
    {
      $lookup: {
        from: 'users',
        let: { organizationId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$organizationId', '$$organizationId'] } } },
          { $addFields: { userId: '$_id' } },

          // Nested lookup to get file type breakdown and size per user
          {
            $lookup: {
              from: 'files',
              let: { userId: '$userId' },
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
                    size: 1, // Include the size field for summation
                  },
                },
                {
                  $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    totalSize: { $sum: '$size' }, // Sum up the file sizes
                  },
                },
              ],
              as: 'fileTypeBreakdown',
            },
          },

          // Add total file count, size, and file type breakdown fields for each user
          {
            $addFields: {
              totalFileCount: { $sum: '$fileTypeBreakdown.count' },
              totalSpaceUsed: { $sum: '$fileTypeBreakdown.totalSize' }, // Total size per user
              fileTypeBreakdown: {
                $arrayToObject: {
                  $map: {
                    input: '$fileTypeBreakdown',
                    as: 'item',
                    in: { k: '$$item._id', v: { count: '$$item.count', totalSize: '$$item.totalSize' } },
                  },
                },
              },
            },
          },
        ],
        as: 'usersData',
      },
    },

    // Lookup to get users who logged in within the last month
    {
      $lookup: {
        from: 'users',
        let: { organizationId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$organizationId', '$$organizationId'] } } },
          { $match: { lastLogin: { $gte: oneMonthAgo } } }, // Filter users with lastLogin within the last month
          { $count: 'loggedInLastMonth' },
        ],
        as: 'loggedInLastMonthCount',
      },
    },

    // Add the activeLicense count for each organization
    {
      $addFields: {
        activeLicense: {
          $size: {
            $filter: {
              input: '$usersData',
              as: 'user',
              cond: {
                $and: [
                  { $eq: ['$$user.status', 'active'] },
                  { $ne: ['$$user.roleId', 1] }, // Exclude Super Admins
                ],
              },
            },
          },
        },
      },
    },

    // Add organization-level summary fields
    {
      $addFields: {
        totalUserCount: { $size: '$usersData' },
        totalWorkspaceCount: { $ifNull: [{ $arrayElemAt: ['$workspaceCount.totalWorkspaceCount', 0] }, 0] },
        totalFileCount: {
          $sum: {
            $map: {
              input: '$usersData',
              as: 'user',
              in: '$$user.totalFileCount',
            },
          },
        },
        totalSpaceUsed: {
          $sum: {
            $map: {
              input: '$usersData',
              as: 'user',
              in: '$$user.totalSpaceUsed',
            },
          },
        },
        fileTypeBreakdown: {
          $mergeObjects: {
            $map: {
              input: '$usersData',
              as: 'user',
              in: '$$user.fileTypeBreakdown',
            },
          },
        },
        usersLoggedInLastMonth: { $ifNull: [{ $arrayElemAt: ['$loggedInLastMonthCount.loggedInLastMonth', 0] }, 0] },
      },
    },

    {
      $addFields: {
        averageFilesPerUser: {
          $cond: {
            if: { $gt: ['$totalUserCount', 0] },
            then: { $round: [{ $divide: ['$totalFileCount', '$totalUserCount'] }, 2] },
            else: 0,
          },
        },
        averageFilesPerWorkspace: {
          $cond: {
            if: { $gt: ['$totalWorkspaceCount', 0] },
            then: { $round: [{ $divide: ['$totalFileCount', '$totalWorkspaceCount'] }, 2] },
            else: 0,
          },
        },
      },
    },

    // Final projection of fields
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        status: 1,
        totalLicenses: 1,
        activeLicense: 1,
        licenseExpiresAt: 1,
        createdAt: 1,
        updatedAt: 1,
        lastWorkspaceId: 1,
        fileTypeBreakdown: 1,
        totalUserCount: 1,
        totalFileCount: 1,
        totalSpaceUsed: 1, // Include total file size in final output
        totalWorkspaceCount: 1,
        usersLoggedInLastMonth: 1, // New field to track users who logged in last month
        averageFilesPerUser: 1,
        averageFilesPerWorkspace: 1,
      },
    },
  ]);

  const totalCount = await Organization.countDocuments(query);

  return { data, totalCount };
};
