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
  { permission: 'GET:/common/entities/:entityId', isChangeable: false },
  {
    permission: 'GET:/common/dataSource/code/:code',
    isChangeable: false,
  },
  {
    permission: 'GET:/common/dataSource/name/:name',
    isChangeable: false,
  },
  { permission: 'GET:/common/dataSource/list', isChangeable: true },
  {
    permission: 'GET:/common/dataSource/dataSourceId/:dataSourceId',
    isChangeable: false,
  },
  {
    permission: 'POST:/common/dataSource/getWidgetDataByFilter',
    isChangeable: false,
  },
  {
    permission: 'POST:/common/dataSource/getWidgetDataByFilter/export',
    isChangeable: true,
  },
  {
    permission: 'GET:/common/attributeOptions/list',
    isChangeable: false,
  },
  {
    permission: 'GET:/common/attributeOptions/get/:attributeId',
    isChangeable: false,
  },
  { permission: 'POST:/common/files/upload', isChangeable: true },
  {
    permission: 'GET:/common/dataSourceVersion/list',
    isChangeable: true,
  },
  {
    permission:
      'GET:/common/dataSourceVersion/dataSourceId/:dataSourceId/versionValue/:versionValue/versionName/:versionName',
    isChangeable: false,
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
    permission: 'GET:/common/dataSourceVersion/versionData/export',
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
    isChangeable: false,
  },
  {
    permission: 'GET:/common/dataSourceVersion/listAllAvailableDataSourceVersionValue',
    isChangeable: false,
  },
  {
    permission: 'GET:/common/dataImportError/list',
    isChangeable: false,
  },
  { permission: 'GET:/common/dashboard/list', isChangeable: true },
  {
    permission: 'GET:/common/dashboard/get/:dashboardId',
    isChangeable: false,
  },
  {
    permission: 'GET:/common/dashboard/widget/getWidgets/:dashboardId',
    isChangeable: true,
  },
  {
    permission: 'POST:/common/dashboard/widget/getWidgetData',
    isChangeable: false,
  },
  {
    permission: 'GET:/common/dashboard/widget/getPlotTypes',
    isChangeable: false,
  },
  {
    permission: 'GET:/common/widgetType/get/:widgetTypeId',
    isChangeable: false,
  },
  { permission: 'GET:/common/widgetType/list', isChangeable: false },
  {
    permission: 'GET:/common/operator/get/:operatorId',
    isChangeable: false,
  },
  { permission: 'POST:/common/operator/list', isChangeable: false },
  { permission: 'GET:/common/widgetTheme/list', isChangeable: false },
  {
    permission: 'GET:/common/widgetTheme/:widgetThemeId',
    isChangeable: false,
  },
  {
    permission: 'GET:/common/dashboardShare/list/:dashboardId',
    isChangeable: false,
  },
  {
    permission: 'POST:/common/dashboardShare/create',
    isChangeable: false,
  },
  {
    permission: 'POST:/common/dashboardShare/:dashboardShareId',
    isChangeable: false,
  },
  {
    permission: 'GET:/reportivix/customReports/list',
    isChangeable: false,
  },
  {
    permission: 'GET:/reportivix/customReports/listReportRequest',
    isChangeable: true,
  },
  {
    permission: 'GET:/reportivix/customReports/getVersionValue',
    isChangeable: false,
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
    permission: 'GET:/reportivix/customReports/downloadSupplementalIntermediate/:customReportId',
    isChangeable: false,
  },
  {
    permission: 'GET:/reportivix/customReports/reportDataOnDataSourceVersionId/:dataSourceVersionId',
    isChangeable: false,
  },
  {
    permission: 'GET:/reportivix/customReports/customReportDesignData/:customReportId',
    isChangeable: false,
  },
  {
    permission: 'GET:/reportivix/customReports/reportDetails/:reportRequestId',
    isChangeable: false,
  },
  {
    permission: 'GET:/reportivix/customReports/reportData/:dataSourceId',
    isChangeable: false,
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
    isChangeable: false,
  },
  {
    permission: 'GET:/common/user/image',
    isChangeable: false,
  },
  {
    permission: 'DELETE:/common/user/image',
    isChangeable: false,
  },
  {
    permission: 'GET:/common/designation/list',
    isChangeable: true,
  },
  {
    permission: 'GET:/common/department/list',
    isChangeable: true,
  },
  { permission: 'GET:/common/derivedField/list', isChangeable: false },
  { permission: 'GET:/common/derivedField/:id', isChangeable: false },
  {
    permission: "GET:/common/download-request/list",
    isChangeable: false,
  },
  {
    permission: "GET:/common/download-request/download/:id",
    isChangeable: false,
  },
  {
    permission: 'GET:/notivix/notification-setting/type/list',
    isChangeable: true,
  },
  {
    permission: 'GET:/notivix/notification-setting/frequency/list',
    isChangeable: true,
  },
  {
    permission: 'GET:/notivix/notification-setting/template/list',
    isChangeable: true,
  },
  {
    permission: 'GET:/notivix/notification-setting/medium/list',
    isChangeable: true,
  },
  {
    permission: 'GET:/notivix/notification-setting/prepared/notification/list',
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
  {
    permission: 'GET:/common/role-default-dashboard/list',
    isChangeable: true,
  },
  {
    permission: 'GET:/common/business-unit/list',
    isChangeable: true,
  },
];

const defaultPermissionsAdmin = [
  ...defaultPermissionsUser,
  { permission: 'POST:/common/user/create', isChangeable: true },
  { permission: 'GET:/common/user/list', isChangeable: true },
  { permission: 'GET:/common/user/:userId', isChangeable: false },
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
  { permission: 'GET:/common/role/:roleId', isChangeable: false },
  { permission: 'POST:/common/role/create', isChangeable: true },
  { permission: 'PUT:/common/role/update/:roleId', isChangeable: true },
  {
    permission: 'DELETE:/common/role/delete/:roleId',
    isChangeable: true,
  },
  {
    permission: 'GET:/common/product-subscription/list',
    isChangeable: false,
  },
  {
    permission: 'GET:/common/organization/get-current-organization',
    isChangeable: false,
  },
  { permission: 'GET:/common/organization/list', isChangeable: true },
  { permission: 'PUT:/common/organization/update/:organizationId', isChangeable: true },
  { permission: 'GET:/common/organization/:organizationId', isChangeable: false },
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
    isChangeable: false,
  },
  {
    permission: 'PUT:/common/attributeOptions/update/:attributeId',
    isChangeable: false,
  },
  {
    permission: 'POST:/common/dashboard/selectTheme/:dashboardId',
    isChangeable: false,
  },
  { permission: 'POST:/common/widgetTheme/create', isChangeable: false },
  {
    permission: 'POST:/common/widgetTheme/duplicate/:widgetThemeId',
    isChangeable: false,
  },
  {
    permission: 'POST:/common/widgetTheme/update/:widgetThemeId',
    isChangeable: false,
  },
  {
    permission: 'POST:/common/widgetTheme/delete/:widgetThemeId',
    isChangeable: false,
  },
  {
    permission: 'POST:/reportivix/customReports/updateSettings/:customReportId',
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
    permission: 'POST:/notivix/notification-setting/type/summary',
    isChangeable: false,
  },
  {
    permission: 'GET:/notivix/notification-setting/type/:id',
    isChangeable: false,
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
    isChangeable: false,
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
    isChangeable: false,
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
  {
    permission: 'GET:/notivix/notification-setting/medium/:id',
    isChangeable: false,
  },
  {
    permission: 'POST:/notivix/notification-setting/prepared/trigger',
    isChangeable: true,
  },
  {
    permission: 'POST:/notivix/notification-setting/prepared/notification/resend',
    isChangeable: true,
  },
  { permission: 'GET:/common/dashboardFont/list', isChangeable: false },
  {
    permission: 'GET:/common/dashboardFont/download/:fontId',
    isChangeable: false,
  },
  {
    permission: 'DELETE:/common/dashboardFont/delete/:fontId',
    isChangeable: false,
  },
  { permission: 'GET:/common/dashboardTheme/list', isChangeable: false },
  {
    permission: 'POST:/common/dashboardTheme/create',
    isChangeable: false,
  },
  {
    permission: 'PUT:/common/dashboardTheme/update/:themeId',
    isChangeable: false,
  },
  {
    permission: 'DELETE:/common/dashboardTheme/delete/:themeId',
    isChangeable: false,
  },
  {
    permission: 'GET:/notivix/notification-setting/medium/:id',
    isChangeable: false,
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
  { permission: 'GET:/common/product/list', isChangeable: false },
  {
    permission: 'POST:/common/user-data-permission/create',
    isChangeable: true,
  },
  {
    permission: 'PUT:/common/user-data-permission/update/:id',
    isChangeable: true,
  },
  {
    permission: 'DELETE:/common/user-data-permission/delete/:id',
    isChangeable: true,
  },
  {
    permission: 'GET:/common/user-data-permission/list',
    isChangeable: true,
  },
  {
    permission: 'GET:/common/user-data-permission/:id',
    isChangeable: false,
  },
  { permission: 'GET:/common/organization-visibility-setting/list', isChangeable: true },
  { permission: 'POST:/common/organization-visibility-setting/create', isChangeable: true },
  { permission: 'PUT:/common/organization-visibility-setting/update/:settingId', isChangeable: true },
  { permission: 'DELETE:/common/organization-visibility-setting/delete/:settingId', isChangeable: true },
  {
    permission: 'POST:/common/role-default-dashboard/create',
    isChangeable: true,
  },
  {
    permission: 'PUT:/common/role-default-dashboard/update/:roleId',
    isChangeable: true,
  },
  {
    permission: 'DELETE:/common/role-default-dashboard/delete/:roleId',
    isChangeable: true,
  },
  {
    permission: 'POST:/common/derivedField/create',
    isChangeable: false,
  },
  {
    permission: 'PUT:/common/derivedField/update/:id',
    isChangeable: false,
  },
  {
    permission: 'DELETE:/common/derivedField/delete/:id',
    isChangeable: false,
  },
  {
    permission: 'POST:/common/business-unit/create',
    isChangeable: true,
  },
  {
    permission: 'PUT:/common/business-unit/update/:businessUnitId',
    isChangeable: true,
  },
  {
    permission: 'DELETE:/common/business-unit/delete/:businessUnitId',
    isChangeable: true,
  },
  { permission: 'GET:/invoicivixVendor/vendor/list', isChangeable: true },
  { permission: 'PUT:/invoicivixVendor/vendor/update/:vendorId', isChangeable: true },
  { permission: 'GET:/invoicivixVendor/vendor/:vendorId', isChangeable: false },
  { permission: 'POST:/invoicivixVendor/vendor/create', isChangeable: true },
  { permission: 'DELETE:/invoicivixVendor/vendor/delete/:vendorId', isChangeable: true },

  { permission: 'GET:/invoicivixVendor/engagement-letter/list', isChangeable: true },
  { permission: 'PUT:/invoicivixVendor/engagement-letter/update/:engagementLetterId', isChangeable: true },
  { permission: 'GET:/invoicivixVendor/engagement-letter/:engagementLetterId', isChangeable: false },
  { permission: 'POST:/invoicivixVendor/engagement-letter/create', isChangeable: true },
  { permission: 'DELETE:/invoicivixVendor/engagement-letter/delete/:engagementLetterId', isChangeable: true },

  { permission: 'GET:/invoicivixVendor/legal-document/list', isChangeable: true },
  { permission: 'PUT:/invoicivixVendor/legal-document/update/:legalDocumentId', isChangeable: true },
  { permission: 'GET:/invoicivixVendor/legal-document/:legalDocumentId', isChangeable: false },
  { permission: 'POST:/invoicivixVendor/legal-document/create', isChangeable: true },
  { permission: 'DELETE:/invoicivixVendor/legal-document/delete/:legalDocumentId', isChangeable: true },

  { permission: 'GET:/invoicivixVendor/activity-rate-card/list', isChangeable: true },
  { permission: 'PUT:/invoicivixVendor/activity-rate-card/update/:activityRateCardId', isChangeable: true },
  { permission: 'GET:/invoicivixVendor/activity-rate-card/:activityRateCardId', isChangeable: false },
  { permission: 'POST:/invoicivixVendor/activity-rate-card/create', isChangeable: true },
  { permission: 'DELETE:/invoicivixVendor/activity-rate-card/delete/:activityRateCardId', isChangeable: true },

  { permission: 'GET:/invoicivixVendor/vendor-attorney/list', isChangeable: true },
  { permission: 'PUT:/invoicivixVendor/vendor-attorney/update/:attorneyId', isChangeable: true },
  { permission: 'GET:/invoicivixVendor/vendor-attorney/:attorneyId', isChangeable: false },
  { permission: 'POST:/invoicivixVendor/vendor-attorney/create', isChangeable: true },
  { permission: 'DELETE:/invoicivixVendor/vendor-attorney/delete/:attorneyId', isChangeable: true },

  { permission: 'GET:/invoicivixVendor/vendor-invoice/list', isChangeable: true },
  { permission: 'PUT:/invoicivixVendor/vendor-invoice/update/:invoiceId', isChangeable: true },
  { permission: 'GET:/invoicivixVendor/vendor-invoice/:invoiceId', isChangeable: false },
  { permission: 'POST:/invoicivixVendor/vendor-invoice/create', isChangeable: true },
  { permission: 'DELETE:/invoicivixVendor/vendor-invoice/delete/:invoiceId', isChangeable: true },
];

const defaultPermissionsSuperAdmin = [
  ...defaultPermissionsAdmin,
];

const defaultPermissionsPrimarySuperAdmin = [
  ...defaultPermissionsAdmin,
  { permission: 'POST:/common/organization/create', isChangeable: true },
  { permission: 'DELETE:/common/organization/delete/:organizationId', isChangeable: true },
  { permission: 'POST:/common/widgetType/create', isChangeable: false },
  { permission: 'POST:/common/widgetType/update/:widgetTypeId', isChangeable: false },
  { permission: 'POST:/common/widgetType/delete/:widgetTypeId', isChangeable: false },
  { permission: 'POST:/common/operator/update/:operatorId', isChangeable: false },
  { permission: 'POST:/common/operator/create', isChangeable: false },
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
    isSuperUser: false,
    permissionsList: defaultPermissionsSuperAdmin,
  },
  {
    roleName: 'Primary Super Admin',
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
      const { roleName } = roleItem;
      let { permissionsList, isSuperUser } = roleItem;

       // -------------------------------------------------------
      // MASTER ORG LOGIC
      // -------------------------------------------------------
      if (organization.isMaster) {
        // Skip Primary Super Admin entirely
        if (roleName === 'Primary Super Admin') {
          console.info(`⏭️ Skipping Primary Super Admin for master org`);
          continue;
        }

        // Super Admin becomes Primary Super Admin
        if (roleName === 'Super Admin') {
          console.info(`⭐ Master org: Super Admin uses Primary Super Admin permissions`);
          permissionsList = defaultPermissionsPrimarySuperAdmin;
          isSuperUser = true;
        }
      }

      // -------------------------------------------------------
      // NON-MASTER ORG LOGIC
      // -------------------------------------------------------
      if (!organization.isMaster && roleName === 'Primary Super Admin') {
        console.info(`⏭️ Skipping Primary Super Admin for non-master org`);
        continue;
      }

      let role = await UserRole.findOne({
        organizationId: orgId,
        name: roleName,
      });

      // --------------------------
      //  CREATE or UPDATE Role
      // --------------------------
      const rolePayload: any = {
        organizationId: orgId,
        name: roleName,
        isSuperUser,
        status: 'active',
      };

      if (!role) {
        role = new UserRole(rolePayload);
        await role.save();
        console.log(`✅ Role "${roleName}" created for org "${organization.name}"`);
      } else {
        // Update only changed fields
        const updateRolePayload: any = {};
        for (const key of Object.keys(rolePayload)) {
          const oldVal = role[key];
          const newVal = rolePayload[key];

          const isMissing = oldVal === undefined || oldVal === null;
          const isDifferent = JSON.stringify(oldVal) !== JSON.stringify(newVal);

          if (isMissing || isDifferent) updateRolePayload[key] = newVal;
        }

        if (Object.keys(updateRolePayload).length > 0) {
          await UserRole.updateOne(
            { _id: role._id },
            { $set: updateRolePayload }
          );
          console.log(`🔄 Role "${roleName}" updated:`, updateRolePayload);
        } else {
          console.log(`ℹ️ Role "${roleName}" already up-to-date.`);
        }
      }

      // --------------------------
      //  PERMISSIONS LOOP
      // --------------------------
      for (const permItem of permissionsList) {
        const { permission, isChangeable } =
          typeof permItem === 'string'
            ? { permission: permItem, isChangeable: true }
            : permItem;

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

        // --------------------------
        //  CREATE RoleHasPermission
        // --------------------------
        const basePayload = {
          roleId: role._id,
          permissionId: permissionDoc._id,
          isChangeable,
          status: 'active',
        };

        if (!existing) {
          await new RoleHasPermission(basePayload).save();
          console.log(
            `✅ Permission assigned to ${roleName}: ${method}:${resourceId}`
          );
        } else {
          // --------------------------
          //  UPDATE existing RoleHasPermission
          // --------------------------
          const updatePayload: any = {};

          for (const key of Object.keys(basePayload)) {
            const oldVal = existing[key];
            const newVal = basePayload[key];

            const isMissing = oldVal === undefined || oldVal === null;
            const isDifferent = JSON.stringify(oldVal) !== JSON.stringify(newVal);

            if (isMissing || isDifferent) updatePayload[key] = newVal;
          }

          if (Object.keys(updatePayload).length > 0) {
            await RoleHasPermission.updateOne(
              { _id: existing._id },
              { $set: updatePayload }
            );

            console.log(
              `🔄 Updated permission for ${roleName}: ${method}:${resourceId}`,
              updatePayload
            );
          } else {
            console.log(
              `ℹ️ Permission already up-to-date for ${roleName}: ${method}:${resourceId}`
            );
          }
        }
      }
    }
  }
}

