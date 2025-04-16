/* eslint-disable @typescript-eslint/no-explicit-any */
import TransferDashboard from '../models/transferDashboard';
import Dashboard from '../models/dashboard';
import mongoose from 'mongoose';

export const getTransferDashboard = async (query: any) => {
  try {
    const data = await TransferDashboard.findOne(query);
    return data;
  } catch (err) {
    throw err;
  }
};

export const getAllTransferDashboard = async (query: any) => {
  try {
    const data = await TransferDashboard.find(query);
    return data;
  } catch (error) {
    throw error;
  }
};

export const createTransferDashboard = async (data: any) => {
  try {
    const transferDashboard = new TransferDashboard(data);
    await transferDashboard.save();
    return transferDashboard;
  } catch (err) {
    throw err;
  }
};

export const getUnsharedUsers = async (dashboardId: string) => {
  try {
    const pipeline = [
      // Step 1: Get the dashboard
      {
        $match: {
          _id: new mongoose.Types.ObjectId(dashboardId),
          isDeleted: false,
          isActive: true,
        },
      },
      // Step 2: Lookup users in the same organization
      {
        $lookup: {
          from: 'users',
          let: { orgId: '$organizationId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$organizationId', '$$orgId'] },
              },
            },
            {
              $project: {
                password: 0, // Exclude password field
              },
            },
          ],
          as: 'organizationUsers',
        },
      },
      // Step 3: Lookup users who already have access
      {
        $lookup: {
          from: 'transfer_dashboards',
          let: { dashboardId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$dashboardId', '$$dashboardId'] },
              },
            },
          ],
          as: 'sharedUsers',
        },
      },
      // Step 4: Filter out users who already have access
      {
        $project: {
          unsharedUsers: {
            $filter: {
              input: '$organizationUsers',
              as: 'user',
              cond: {
                $not: {
                  $in: [
                    '$$user._id',
                    {
                      $map: {
                        input: '$sharedUsers',
                        as: 'shared',
                        in: '$$shared.receiverUserId',
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
      // Step 5: Unwind the array for easier handling
      {
        $unwind: '$unsharedUsers',
      },
      // Step 6: Replace root with the user document
      {
        $replaceRoot: { newRoot: '$unsharedUsers' },
      },
      // Step 7: Project only the email field
      {
        $project: {
          _id: 0,
          email: 1,
        },
      },
    ];

    const unsharedUsers = await Dashboard.aggregate(pipeline);
    return unsharedUsers.map((user) => user.email);
  } catch (error) {
    throw error;
  }
};
