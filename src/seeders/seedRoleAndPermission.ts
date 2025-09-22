/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import mongoose, { Types } from 'mongoose';
import Permission from '../database/models/common/permissionModel'; // adjust path if needed
import UserRole from '../database/models/common/userRole';
import RoleHasPermission from '../database/models/common/roleHasPermissionModel';
import Organization from '../database/models/common/organization';

const defaultPermissionsUser = [
  'GET:/common/user/get-current-user',
  'PUT:/common/user/update-current-user',
  'PUT:/common/user/change-password',
  'GET:/common/entities/list',
  'GET:/common/entities/:entityId',
  'GET:/common/dataSource/code/:code',
  'GET:/common/dataSource/name/:name',
  'GET:/common/dataSource/list',
  'GET:/common/dataSource/dataSourceId/:dataSourceId',
  'POST:/common/dataSource/getWidgetDataByFilter',
  'GET:/common/attributeOptions/list',
  'GET:/common/attributeOptions/get/:attributeId',
  'POST:/common/files/upload',
  'GET:/common/dataSourceVersion/list',
  'GET:/common/dataSourceVersion/dataSourceId/:dataSourceId/versionValue/:versionValue/versionName/:versionName',
  'POST:/common/dataSourceVersion/create',
  'GET:/common/dataSourceVersion/versionData',
  'POST:/common/dataSourceVersion/versionData/create',
  'PUT:/common/dataSourceVersion/versionData/update/:rowId',
  'DELETE:/common/dataSourceVersion/versionData/delete',
  'GET:/common/dataSourceVersion/listVersionData/:customReportId',
  'GET:/common/dataSourceVersion/listAllAvailableDataSourceVersionValue',
  'GET:/common/dataImportError/list',
  'GET:/common/dashboard/list',
  'GET:/common/dashboard/get/:dashboardId',
  'GET:/common/dashboard/widget/getWidgets/:dashboardId',
  'POST:/common/dashboard/widget/getWidgetData',
  'GET:/common/widgetType/get/:widgetTypeId',
  'GET:/common/widgetType/list',
  'GET:/common/operator/get/:operatorId',
  'POST:/common/operator/list',
  'GET:/common/widgetTheme/list',
  'GET:/common/widgetTheme/:widgetThemeId',
  'GET:/common/dashboardShare/list/:dashboardId',
  'POST:/common/dashboardShare/create',
  'POST:/common/dashboardShare/:dashboardShareId',
  'GET:/reportivix/customReports/list',
  'GET:/reportivix/customReports/listReportRequest',
  'GET:/reportivix/customReports/getVersionValue',
  'POST:/reportivix/customReports/generate',
  'GET:/reportivix/customReports/download/:reportRequestId',
  'GET:/reportivix/customReports/reportDataOnDataSourceVersionId/:dataSourceVersionId',
  'GET:/reportivix/customReports/customReportDesignData/:customReportId',
  'GET:/reportivix/customReports/reportDetails/:reportRequestId',
  'GET:/reportivix/customReports/reportData/:dataSourceId',
  'GET:/reportivix/customReports/listSettings',
  'GET:/reportivix/nlQuery/getData',
  'GET:/reportivix/nlQuery/insights',
  'POST:/common/dataSourceVersion/chartData',
  'GET:/common/designation/list',
  'GET:/common/department/list',
];

const defaultPermissionsAdmin = [
  ...defaultPermissionsUser,
  'POST:/common/user/create',
  'GET:/common/user/list',
  'GET:/common/user/:userId',
  'PUT:/common/user/update/:userId',
  'DELETE:/common/user/delete/:userId',
  'GET:/common/permission/list',
  'POST:/common/permission/create',
  'PUT:/common/permission/update/:permissionId',
  'DELETE:/common/permission/delete/:permissionId',
  'GET:/common/role/list',
  'GET:/common/role/:roleId',
  'POST:/common/role/create',
  'PUT:/common/role/update/:roleId',
  'DELETE:/common/role/delete/:roleId',
  'GET:/common/product-subscription/list',
  'GET:/common/organization/get-current-organization',
  'GET:/common/organization/list',
  'POST:/common/entities/create',
  'PUT:/common/entities/update/:entityId',
  'POST:/common/dataSource/create',
  'PUT:/common/dataSource/update/:dataSourceId',
  'POST:/common/attributeOptions/create',
  'PUT:/common/attributeOptions/update/:attributeId',
  'POST:/common/dashboard/create',
  'POST:/common/dashboard/update/:dashboardId',
  'POST:/common/dashboard/delete/:dashboardId',
  'POST:/common/dashboard/selectTheme/:dashboardId',
  'POST:/common/dashboard/widget/create',
  'POST:/common/dashboard/widget/save',
  'POST:/common/dashboard/widget/update/:dashboardWidgetId',
  'POST:/common/dashboard/widget/delete/:dashboardWidgetId',
  'POST:/common/widgetTheme/create',
  'POST:/common/widgetTheme/duplicate/:widgetThemeId',
  'POST:/common/widgetTheme/update/:widgetThemeId',
  'POST:/common/widgetTheme/delete/:widgetThemeId',
  'POST:/reportivix/customReports/updateSettings/:customReportId',
  'POST:/common/derivedField/create',
  'PUT:/common/derivedField/update/:id',
  'DELETE:/common/derivedField/delete/:id',
  'GET:/common/derivedField/list',
  'GET:/common/derivedField/:id',
  'GET:/notivix/notification-setting/type/list',
  'POST:/notivix/notification-setting/type/create',
  'PUT:/notivix/notification-setting/type/update/:id',
  'DELETE:/notivix/notification-setting/type/delete/:id',
  'GET:/notivix/notification-setting/type/:id',
  'GET:/notivix/notification-setting/frequency/list',
  'POST:/notivix/notification-setting/frequency/create',
  'PUT:/notivix/notification-setting/frequency/update/:id',
  'DELETE:/notivix/notification-setting/frequency/delete/:id',
  'GET:/notivix/notification-setting/frequency/:id',
  'GET:/notivix/notification-setting/template/list',
  'POST:/notivix/notification-setting/template/create',
  'PUT:/notivix/notification-setting/template/update/:id',
  'DELETE:/notivix/notification-setting/template/delete/:id',
  'GET:/notivix/notification-setting/template/:id',
  'GET:/notivix/notification-setting/medium/list',
  'POST:/notivix/notification-setting/medium/create',
  'PUT:/notivix/notification-setting/medium/update/:id',
  'DELETE:/notivix/notification-setting/medium/delete',
  'GET:/common/dashboardFont/list',
  'GET:/common/dashboardFont/download/:fontId',
  'DELETE:/common/dashboardFont/delete/:fontId',
  'GET:/common/dashboardTheme/list',
  'POST:/common/dashboardTheme/create',
  'PUT:/common/dashboardTheme/update/:themeId',
  'DELETE:/common/dashboardTheme/delete/:themeId',
  'GET:/notivix/notification-setting/medium/:id',
  'POST:/common/designation/create',
  'PUT:/common/designation/update/:designationId',
  'DELETE:/common/designation/delete/:designationId',
  'POST:/common/department/create',
  'PUT:/common/department/update/:departmentId',
  'DELETE:/common/department/delete/:departmentId',
];

const defaultPermissionsPrimarySuperAdmin = [
  ...defaultPermissionsAdmin,
  'GET:/common/product/list',
  'POST:/common/organization/create',
  'PUT:/common/organization/update/:organizationId',
  'DELETE:/common/organization/delete/:organizationId',
  'GET:/common/organization/:organizationId',
  'POST:/common/widgetType/create',
  'POST:/common/widgetType/update/:widgetTypeId',
  'POST:/common/widgetType/delete/:widgetTypeId',
  'POST:/common/operator/update/:operatorId',
  'POST:/common/operator/create',
];

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

      // ❌ Only allow Super Admin creation for master organizations
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

      for (const methodResource of permissionsList) {
        const [method, ...rest] = methodResource.split(':');
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
