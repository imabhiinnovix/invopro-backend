import RoleDefaultDashboard from '../../models/common/roleDefaultDashboard.model';
import { Types } from 'mongoose';

interface RoleDefaultDashboardPayload {
  organizationId: Types.ObjectId;
  roleId: Types.ObjectId;
  dashboardId: Types.ObjectId;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

/**
 * CREATE default dashboard for a role
 */
export const createRoleDefaultDashboard = async ({ organizationId, roleId, dashboardId, createdBy }: RoleDefaultDashboardPayload) => {
  const exists = await RoleDefaultDashboard.findOne({ organizationId, roleId, isDeleted: false });

  if (exists) {
    throw new Error('Default dashboard already exists for this role');
  }

  return RoleDefaultDashboard.create({
    organizationId,
    roleId,
    dashboardId,
    createdBy,
    updatedBy: createdBy,
  });
};

/**
 * UPDATE default dashboard for a role
 */
export const updateRoleDefaultDashboard = async ({ organizationId, roleId, dashboardId, updatedBy }: RoleDefaultDashboardPayload) => {
  const record = await RoleDefaultDashboard.findOneAndUpdate(
    { organizationId, roleId, isDeleted: false },
    { dashboardId, updatedBy },
    { new: true }
  );

  if (!record) {
    throw new Error('Default dashboard not found for this role');
  }

  return record;
};

/**
 * DELETE default dashboard for a role (soft delete)
 */
export const deleteRoleDefaultDashboard = async (organizationId: Types.ObjectId, roleId: Types.ObjectId) => {
  const record = await RoleDefaultDashboard.findOneAndUpdate(
    { organizationId, roleId, status: 'inactive' },
    { isDeleted: true },
    { new: true }
  );

  if (!record) {
    throw new Error('Default dashboard not found for this role');
  }

  return record;
};

/**
 * LIST all role default dashboards (organization-wise)
 */
export const listRoleDefaultDashboards = async (organizationId: Types.ObjectId) => {
  return RoleDefaultDashboard.find({ organizationId, status: 'active' })
    .populate('roleId', 'name')
    .populate('dashboardId', 'name isDefault')
    .sort({ createdAt: -1 });
};