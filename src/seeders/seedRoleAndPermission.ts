/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import mongoose, { Types } from 'mongoose';
import Permission from '../database/models/common/permissionModel'; // adjust path if needed
import UserRole from '../database/models/common/userRole';
import RoleHasPermission from '../database/models/common/roleHasPermissionModel';
import Organization from '../database/models/common/organization';

// ------------------ Default Permission Sets ------------------ //
const defaultPermissionsUser = [
  {
    permission: 'GET:/common/user/get-current-user',
    isChangeable: false,
  },
  {
    permission: 'PUT:/common/user/update-current-user',
    isChangeable: true,
  },
  {
    permission: 'PUT:/common/user/change-password',
    isChangeable: true,
  },
  { permission: 'GET:/common/entities/list', isChangeable: true },
  { permission: 'GET:/common/entities/:entityId', isChangeable: true },
  {
    permission: 'GET:/common/dataSource/code/:code',
    isChangeable: true,
  },
  {
    permission: 'GET:/common/dataSource/name/:name',
    isChangeable: true,
  },
  { permission: 'GET:/common/dataSource/list', isChangeable: true },
  {
    permission: 'GET:/common/dataSource/dataSourceId/:dataSourceId',
    isChangeable: true,
  },
  {
    permission: 'POST:/common/dataSource/getWidgetDataByFilter',
    isChangeable: true,
  },
  {
    permission: 'GET:/common/attributeOptions/list',
    isChangeable: true,
  },
  {
    permission: 'GET:/common/attributeOptions/get/:attributeId',
    isChangeable: true,
  },
  { permission: 'POST:/common/files/upload', isChangeable: true },
  {
    permission: 'GET:/common/dataSourceVersion/list',
    isChangeable: true,
  },
  {
    permission:
      'GET:/common/dataSourceVersion/dataSourceId/:dataSourceId/versionValue/:versionValue/versionName/:versionName',
    isChangeable: true,
  },
  {
    permission: 'POST:/common/dataSourceVersion/create',
    isChangeable: true,
  },
  {
    permission: 'GET:/common/dataSourceVersion/versionData',
    isChangeable: true,
  },
  {
    permission: 'POST:/common/dataSourceVersion/versionData/create',
    isChangeable: true,
  },
  {
    permission: 'PUT:/common/dataSourceVersion/versionData/update/:rowId',
    isChangeable: true,
  },
  {
    permission: 'DELETE:/common/dataSourceVersion/versionData/delete',
    isChangeable: true,
  },
  {
    permission: 'GET:/common/dataSourceVersion/listVersionData/:customReportId',
    isChangeable: true,
  },
  {
    permission: 'GET:/common/dataSourceVersion/listAllAvailableDataSourceVersionValue',
    isChangeable: true,
  },
  {
    permission: 'GET:/common/dataImportError/list',
    isChangeable: true,
  },
  { permission: 'GET:/common/dashboard/list', isChangeable: true },
  {
    permission: 'GET:/common/dashboard/get/:dashboardId',
    isChangeable: true,
  },
  {
    permission: 'GET:/common/dashboard/widget/getWidgets/:dashboardId',
    isChangeable: true,
  },
  {
    permission: 'POST:/common/dashboard/widget/getWidgetData',
    isChangeable: true,
  },
  {
    permission: 'GET:/common/widgetType/get/:widgetTypeId',
    isChangeable: true,
  },
  { permission: 'GET:/common/widgetType/list', isChangeable: true },
  {
    permission: 'GET:/common/operator/get/:operatorId',
    isChangeable: true,
  },
  { permission: 'POST:/common/operator/list', isChangeable: true },
  { permission: 'GET:/common/widgetTheme/list', isChangeable: true },
  {
    permission: 'GET:/common/widgetTheme/:widgetThemeId',
    isChangeable: true,
  },
  {
    permission: 'GET:/common/dashboardShare/list/:dashboardId',
    isChangeable: true,
  },
  {
    permission: 'POST:/common/dashboardShare/create',
    isChangeable: true,
  },
  {
    permission: 'POST:/common/dashboardShare/:dashboardShareId',
    isChangeable: true,
  },
  {
    permission: 'GET:/reportivix/customReports/list',
    isChangeable: true,
  },
  {
    permission: 'GET:/reportivix/customReports/listReportRequest',
    isChangeable: true,
  },
  {
    permission: 'GET:/reportivix/customReports/getVersionValue',
    isChangeable: true,
  },
  {
    permission: 'POST:/reportivix/customReports/generate',
    isChangeable: true,
  },
  {
    permission: 'GET:/reportivix/customReports/download/:reportRequestId',
    isChangeable: true,
  },
  {
    permission: 'GET:/reportivix/customReports/reportDataOnDataSourceVersionId/:dataSourceVersionId',
    isChangeable: true,
  },
  {
    permission: 'GET:/reportivix/customReports/customReportDesignData/:customReportId',
    isChangeable: true,
  },
  {
    permission: 'GET:/reportivix/customReports/reportDetails/:reportRequestId',
    isChangeable: true,
  },
  {
    permission: 'GET:/reportivix/customReports/reportData/:dataSourceId',
    isChangeable: true,
  },
  {
    permission: 'GET:/reportivix/customReports/listSettings',
    isChangeable: true,
  },
  { permission: 'GET:/reportivix/nlQuery/getData', isChangeable: true },
  {
    permission: 'GET:/reportivix/nlQuery/insights',
    isChangeable: true,
  },
  {
    permission: 'POST:/common/dataSourceVersion/chartData',
    isChangeable: true,
  },
  {
    permission: 'GET:/common/user/image',
    isChangeable: true,
  },
  {
    permission: 'DELETE:/common/user/image',
    isChangeable: true,
  },
  {
    permission: 'GET:/common/designation/list',
    isChangeable: true,
  },
  {
    permission: 'GET:/common/department/list',
    isChangeable: true,
  },
];

const defaultPermissionsAdmin = [
  ...defaultPermissionsUser,
  { permission: 'POST:/common/user/create', isChangeable: true },
  { permission: 'GET:/common/user/list', isChangeable: true },
  { permission: 'GET:/common/user/:userId', isChangeable: true },
  { permission: 'PUT:/common/user/update/:userId', isChangeable: true },
  {
    permission: 'DELETE:/common/user/delete/:userId',
    isChangeable: true,
  },
  { permission: 'GET:/common/permission/list', isChangeable: true },
  { permission: 'POST:/common/permission/create', isChangeable: true },
  {
    permission: 'PUT:/common/permission/update/:permissionId',
    isChangeable: true,
  },
  {
    permission: 'DELETE:/common/permission/delete/:permissionId',
    isChangeable: true,
  },
  { permission: 'GET:/common/role/list', isChangeable: true },
  { permission: 'GET:/common/role/:roleId', isChangeable: true },
  { permission: 'POST:/common/role/create', isChangeable: true },
  { permission: 'PUT:/common/role/update/:roleId', isChangeable: true },
  {
    permission: 'DELETE:/common/role/delete/:roleId',
    isChangeable: true,
  },
  {
    permission: 'GET:/common/product-subscription/list',
    isChangeable: true,
  },
  {
    permission: 'GET:/common/organization/get-current-organization',
    isChangeable: true,
  },
  { permission: 'GET:/common/organization/list', isChangeable: true },
  { permission: 'POST:/common/entities/create', isChangeable: true },
  {
    permission: 'PUT:/common/entities/update/:entityId',
    isChangeable: true,
  },
  { permission: 'POST:/common/dataSource/create', isChangeable: true },
  {
    permission: 'PUT:/common/dataSource/update/:dataSourceId',
    isChangeable: true,
  },
  {
    permission: 'POST:/common/attributeOptions/create',
    isChangeable: true,
  },
  {
    permission: 'PUT:/common/attributeOptions/update/:attributeId',
    isChangeable: true,
  },
  { permission: 'POST:/common/dashboard/create', isChangeable: true },
  {
    permission: 'POST:/common/dashboard/update/:dashboardId',
    isChangeable: true,
  },
  {
    permission: 'POST:/common/dashboard/delete/:dashboardId',
    isChangeable: true,
  },
  {
    permission: 'POST:/common/dashboard/selectTheme/:dashboardId',
    isChangeable: true,
  },
  {
    permission: 'POST:/common/dashboard/widget/create',
    isChangeable: true,
  },
  {
    permission: 'POST:/common/dashboard/widget/save',
    isChangeable: true,
  },
  {
    permission: 'POST:/common/dashboard/widget/update/:dashboardWidgetId',
    isChangeable: true,
  },
  {
    permission: 'POST:/common/dashboard/widget/delete/:dashboardWidgetId',
    isChangeable: true,
  },
  { permission: 'POST:/common/widgetTheme/create', isChangeable: true },
  {
    permission: 'POST:/common/widgetTheme/duplicate/:widgetThemeId',
    isChangeable: true,
  },
  {
    permission: 'POST:/common/widgetTheme/update/:widgetThemeId',
    isChangeable: true,
  },
  {
    permission: 'POST:/common/widgetTheme/delete/:widgetThemeId',
    isChangeable: true,
  },
  {
    permission: 'POST:/reportivix/customReports/updateSettings/:customReportId',
    isChangeable: true,
  },
  {
    permission: 'POST:/common/derivedField/create',
    isChangeable: true,
  },
  {
    permission: 'PUT:/common/derivedField/update/:id',
    isChangeable: true,
  },
  {
    permission: 'DELETE:/common/derivedField/delete/:id',
    isChangeable: true,
  },
  { permission: 'GET:/common/derivedField/list', isChangeable: true },
  { permission: 'GET:/common/derivedField/:id', isChangeable: true },
  {
    permission: 'GET:/notivix/notification-setting/type/list',
    isChangeable: true,
  },
  {
    permission: 'POST:/notivix/notification-setting/type/create',
    isChangeable: true,
  },
  {
    permission: 'PUT:/notivix/notification-setting/type/update/:id',
    isChangeable: true,
  },
  {
    permission: 'DELETE:/notivix/notification-setting/type/delete/:id',
    isChangeable: true,
  },
  {
    permission: 'GET:/notivix/notification-setting/type/summary',
    isChangeable: true,
  },
  {
    permission: 'GET:/notivix/notification-setting/type/:id',
    isChangeable: true,
  },
  {
    permission: 'GET:/notivix/notification-setting/frequency/list',
    isChangeable: true,
  },
  {
    permission: 'POST:/notivix/notification-setting/frequency/create',
    isChangeable: true,
  },
  {
    permission: 'PUT:/notivix/notification-setting/frequency/update/:id',
    isChangeable: true,
  },
  {
    permission: 'DELETE:/notivix/notification-setting/frequency/delete/:id',
    isChangeable: true,
  },
  {
    permission: 'GET:/notivix/notification-setting/frequency/:id',
    isChangeable: true,
  },
  {
    permission: 'GET:/notivix/notification-setting/template/list',
    isChangeable: true,
  },
  {
    permission: 'POST:/notivix/notification-setting/template/create',
    isChangeable: true,
  },
  {
    permission: 'PUT:/notivix/notification-setting/template/update/:id',
    isChangeable: true,
  },
  {
    permission: 'DELETE:/notivix/notification-setting/template/delete/:id',
    isChangeable: true,
  },
  {
    permission: 'GET:/notivix/notification-setting/template/:id',
    isChangeable: true,
  },
  {
    permission: 'GET:/notivix/notification-setting/medium/list',
    isChangeable: true,
  },
  {
    permission: 'POST:/notivix/notification-setting/medium/create',
    isChangeable: true,
  },
  {
    permission: 'PUT:/notivix/notification-setting/medium/update/:id',
    isChangeable: true,
  },
  {
    permission: 'DELETE:/notivix/notification-setting/medium/delete',
    isChangeable: true,
  },
  { permission: 'GET:/common/dashboardFont/list', isChangeable: true },
  {
    permission: 'GET:/common/dashboardFont/download/:fontId',
    isChangeable: true,
  },
  {
    permission: 'DELETE:/common/dashboardFont/delete/:fontId',
    isChangeable: true,
  },
  { permission: 'GET:/common/dashboardTheme/list', isChangeable: true },
  {
    permission: 'POST:/common/dashboardTheme/create',
    isChangeable: true,
  },
  {
    permission: 'PUT:/common/dashboardTheme/update/:themeId',
    isChangeable: true,
  },
  {
    permission: 'DELETE:/common/dashboardTheme/delete/:themeId',
    isChangeable: true,
  },
  {
    permission: 'GET:/notivix/notification-setting/medium/:id',
    isChangeable: true,
  },
  {
    permission: 'POST:/common/designation/create',
    isChangeable: true,
  },
  {
    permission: 'PUT:/common/designation/update/:designationId',
    isChangeable: true,
  },
  {
    permission: 'DELETE:/common/designation/delete/:designationId',
    isChangeable: true,
  },
  {
    permission: 'POST:/common/department/create',
    isChangeable: true,
  },
  {
    permission: 'PUT:/common/department/update/:departmentId',
    isChangeable: true,
  },
  {
    permission: 'DELETE:/common/department/delete/:departmentId',
    isChangeable: true,
  },
];

const defaultPermissionsPrimarySuperAdmin = [
  ...defaultPermissionsAdmin,
  { permission: 'GET:/common/product/list', isChangeable: true },
  { permission: 'POST:/common/organization/create', isChangeable: true },
  { permission: 'PUT:/common/organization/update/:organizationId', isChangeable: true },
  { permission: 'DELETE:/common/organization/delete/:organizationId', isChangeable: true },
  { permission: 'GET:/common/organization/:organizationId', isChangeable: true },
  { permission: 'POST:/common/widgetType/create', isChangeable: true },
  { permission: 'POST:/common/widgetType/update/:widgetTypeId', isChangeable: true },
  { permission: 'POST:/common/widgetType/delete/:widgetTypeId', isChangeable: true },
  { permission: 'POST:/common/operator/update/:operatorId', isChangeable: true },
  { permission: 'POST:/common/operator/create', isChangeable: true },
];

// ------------------ Default Roles ------------------ //
const defaultRolesAndPermissions = [
  {
    roleName: 'User',
    isSuperUser: false,
    permissionsList: defaultPermissionsUser,
  },
  {
    roleName: 'Admin',
    isSuperUser: false,
    permissionsList: defaultPermissionsAdmin,
  },
  {
    roleName: 'Super Admin',
    isSuperUser: true,
    permissionsList: defaultPermissionsPrimarySuperAdmin,
  },
];

interface SeedPayload {
  organizationId: Types.ObjectId[];
}

// ------------------ Seeder Function ------------------ //
export async function seedRolesAndPermissions(payload: SeedPayload) {
  const { organizationId } = payload;

  if (!organizationId || !Array.isArray(organizationId)) {
    throw new Error('organizationId array is required to seed roles and permissions');
  }

  for (const orgId of organizationId) {
    const organization = await Organization.findById(orgId);

    if (!organization) {
      console.warn(`⚠️ Organization not found: ${orgId}`);
      continue;
    }

    for (const roleItem of defaultRolesAndPermissions) {
      const { roleName, isSuperUser, permissionsList } = roleItem;

      if (isSuperUser && !organization.isMaster) {
        console.info(`⏭️ Skipping Super Admin role for non-master organization: ${organization.name}`);
        continue;
      }

      let role = await UserRole.findOne({
        organizationId: orgId,
        name: roleName,
      });

      if (!role) {
        role = new UserRole({
          organizationId: orgId,
          name: roleName,
          isSuperUser,
          status: 'active',
        });
        await role.save();
        console.log(`✅ Role "${roleName}" created for org "${organization.name}"`);
      } else {
        console.log(`ℹ️ Role "${roleName}" already exists for org "${organization.name}"`);
      }

      for (const permItem of permissionsList) {
        // backward compatibility: allow plain string
        const { permission, isChangeable } =
          typeof permItem === 'string' ? { permission: permItem, isChangeable: true } : permItem;

        const [method, ...rest] = permission.split(':');
        const resourceId = rest.join(':');

        const permissionDoc = await Permission.findOne({ method, resourceId });
        if (!permissionDoc) {
          console.warn(`⚠️ Permission not found: ${method}:${resourceId}`);
          continue;
        }

        const existing = await RoleHasPermission.findOne({
          roleId: role._id,
          permissionId: permissionDoc._id,
        });

        if (!existing) {
          await new RoleHasPermission({
            roleId: role._id,
            permissionId: permissionDoc._id,
            isChangeable, // ✅ store new flag
            status: 'active',
          }).save();

          console.log(`✅ Permission assigned to ${roleName}: ${method}:${resourceId}`);
        } else {
          console.log(`ℹ️ Permission already assigned to ${roleName}: ${method}:${resourceId}`);
        }
      }
    }
  }
}
