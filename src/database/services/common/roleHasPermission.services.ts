/* eslint-disable @typescript-eslint/no-explicit-any */
import RoleHasPermission from '../../models/common/roleHasPermissionModel';

export const createUserRoleHasPermission = async (RoleHasPermissionData: any) => {
  try {
    const roleHasPermission = new RoleHasPermission(RoleHasPermissionData);
    await roleHasPermission.save();
    return roleHasPermission;
  } catch (err) {
    throw err;
  }
};
