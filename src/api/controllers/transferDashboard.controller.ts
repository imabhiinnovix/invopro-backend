/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';

import * as userService from '../../database/services/user.service';
import * as dashboardService from '../../database/services/dashboard.services';
import * as transferDashboardService from '../../database/services/transferDashboard.service';

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { receiverEmails, dashboardId, isShareble } = req.body;
    const { userId, organizationId } = req.user;

    const dashboardData = await dashboardService.getDashboard({ _id: dashboardId, isDeleted: false, isActive: true });
    if (!dashboardData) {
      throw new Error('Dashboard not found');
    }

    if (dashboardData.createdBy._id.toString() !== userId.toString()) {
      throw new Error("You can't share dashboard");
    }

    if (isShareble !== undefined) {
      await dashboardService.updateDashboard(dashboardId, { isShareble });
    }

    const results: any = [];
    const errors = [];

    for (const receiverEmail of receiverEmails) {
      try {
        const receiverUserData = await userService.findUserByEmail(receiverEmail);
        if (!receiverUserData) {
          errors.push(`User not found for email: ${receiverEmail}` as never);
          continue;
        }

        if (receiverUserData._id.toString() === userId.toString()) {
          errors.push(`Cannot share dashboard with yourself: ${receiverEmail}` as never);
          continue;
        }

        if (receiverUserData.organizationId._id.toString() !== organizationId.toString()) {
          errors.push(`Cannot share dashboard outside organization: ${receiverEmail}` as never);
          continue;
        }

        const alreadyExist = await transferDashboardService.getTransferDashboard({
          senderUserId: userId,
          receiverUserId: receiverUserData._id,
          dashboardId,
        });

        if (alreadyExist) {
          errors.push(`Dashboard already shared with user: ${receiverEmail}` as never);
          continue;
        }

        const data = await transferDashboardService.createTransferDashboard({
          senderUserId: userId,
          receiverUserId: receiverUserData._id,
          dashboardId,
          organizationId,
        });

        results.push({
          email: receiverEmail,
          success: true,
          data,
        });
      } catch (error: any) {
        errors.push(`Error processing ${receiverEmail}: ${error.message}` as never);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Dashboard shared successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dashboardId } = req.params;
    const { userId } = req.user;

    const unsharedUsers = await transferDashboardService.getUnsharedUsers({ dashboardId, userId });

    if (!unsharedUsers.length) {
      return res.status(404).json({ message: 'Dashboard not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: unsharedUsers,
    });
  } catch (error) {
    next(error);
  }
};
