/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';

import * as userService from '../../database/services/user.service';
import * as dashboardService from '../../database/services/dashboard.services';
import * as transferDashboardService from '../../database/services/transferDashboard.service';

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { receiverEmail, dashboardId } = req.body;
    const { userId, organizationId } = req.user;

    const receiverUserData = await userService.findUserByEmail(receiverEmail);
    if (!receiverUserData) {
      throw new Error('Receiver user not found');
    }

    if (receiverUserData._id.toString() == userId.toString()) {
      throw new Error("You can't share dashboard with yourself!");
    }

    if (receiverUserData.organizationId._id.toString() !== organizationId.toString()) {
      throw new Error("You can't share dashboard to outside of your organization.");
    }

    const dashboardData = await dashboardService.getDashboard({ _id: dashboardId, isDeleted: false, isActive: true });
    if (!dashboardData) {
      throw new Error('Dashboard not found');
    }

    if (dashboardData.createdBy._id.toString() !== userId.toString()) {
      throw new Error("You cant't share dashboard");
    }

    if (dashboardData.isShareble) {
      throw new Error('Dashboard is already shareable!');
    }

    const alreadyExist = await transferDashboardService.getTransferDashboard({
      senderUserId: userId,
      receiverUserId: receiverUserData._id,
      dashboardId,
    });

    if (alreadyExist) {
      throw new Error('Dashboard is already shared with this user.');
    }

    const data = await transferDashboardService.createTransferDashboard({
      senderUserId: userId,
      receiverUserId: receiverUserData._id,
      dashboardId,
      organizationId,
    });

    res.status(201).json({
      success: true,
      message: 'Dashboard shared successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
