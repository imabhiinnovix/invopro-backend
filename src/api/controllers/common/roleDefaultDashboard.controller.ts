import { Request, Response, NextFunction } from 'express';
import * as roleDefaultDashboardService from '../../../database/services/common/roleDefaultDashboard.service';
import { Types } from 'mongoose';

/**
 * CREATE ROLE DEFAULT DASHBOARD
 */
export const createDefaultDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roleId, dashboardId } = req.body;
    const { organizationId, userId } = req.user;

const data = await roleDefaultDashboardService.createRoleDefaultDashboard({
  organizationId: new Types.ObjectId(organizationId),
  roleId: new Types.ObjectId(roleId),
  dashboardId: dashboardId.map((id) => new Types.ObjectId(id)),
  createdBy: new Types.ObjectId(userId),
});


    res.status(201).json({
      success: true,
      message: 'Default dashboard created successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * UPDATE ROLE DEFAULT DASHBOARD
 */
export const updateDefaultDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roleId } = req.params;
    const { dashboardId } = req.body;
    const { organizationId, userId } = req.user;

    const data = await roleDefaultDashboardService.updateRoleDefaultDashboard({
  organizationId: new Types.ObjectId(organizationId),
  roleId: new Types.ObjectId(roleId),
  dashboardId: dashboardId.map((id) => new Types.ObjectId(id)),
  updatedBy: new Types.ObjectId(userId),
});


    res.status(200).json({
      success: true,
      message: 'Default dashboard updated successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE ROLE DEFAULT DASHBOARD
 */
export const deleteDefaultDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roleId } = req.params;
    const { organizationId } = req.user;

    await roleDefaultDashboardService.deleteRoleDefaultDashboard(organizationId, new Types.ObjectId(roleId));

    res.status(200).json({
      success: true,
      message: 'Default dashboard removed successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * LIST ROLE DEFAULT DASHBOARDS
 */
export const listDefaultDashboards = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId } = req.user;
    const { roleId } = req.query;

    const query: any = {
      organizationId,
      status: 'active',
    };

    if (roleId) {
      query.roleId = new Types.ObjectId(roleId as string);
    }

    const data = await roleDefaultDashboardService.listRoleDefaultDashboards(query);

    res.status(200).json({
      success: true,
      message: 'Default dashboards fetched successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
};
