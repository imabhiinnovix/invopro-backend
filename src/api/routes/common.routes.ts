import { Router } from 'express';

import authRoutes from './common/auth.routes';
import userRoutes from './common/user.routes';
import organizationRoutes from './common/organization.routes';
import supportRoutes from './common/support.routes';
import permissionRoutes from './common/permission.routes';
import userRoleRoutes from './common/userRole.routes';
import organizationProductSubscriptionRoutes from './common/organizationProductSubscription.routes';
import productRoutes from './common/product.routes';
import dataSourceVersion from './common/dataSourceVersion.routes';
import dataImportErrorRoutes from './common/dataImportError.routes';
import dashBoardRoutes from './common/dashboard.routes';
import widgetTypeRoutes from './common/widgetType.routes';
import operatorRoutes from './common/operator.routes';
import widgetThemeRoutes from './common/widgetTheme.routes';
import dashboardShareRoutes from './common/dashboardShare.routes';
import entityRoutes from './common/entity.routes';
import attributeRoutes from './common/attributeOption.routes';
import fileRoutes from './common/file.routes';
import dataSourceRoutes from './common/dataSource.routes';
import derivedFieldRoutes from './common/derivedField.routes';
import dashboardFontRoutes from './common/dashboardFont.routes';
import dashboardThemeRoutes from './common/dashboardTheme.routes';
import departmentRoutes from './common/department.routes';
import designationRoutes from './common/designation.routes';
import userDataPermissionRoutes from './common/userDataPermission.routes';
import downloadRequests from './common/downloadRequest.routes';
import organizationVisibilitySettingRoutes from './common/organizationVisibilitySettingRoutes';
import roleDefaultDashboardRoutes from './common/roleDefaultDashboard.routes';
import businessUnitRoutes from './common/businessUnit.routes';
import centralFileRoutes from './common/centralFile.routes';


const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/organization', organizationRoutes);
router.use('/support', supportRoutes);
router.use('/permission', permissionRoutes);
router.use('/role', userRoleRoutes);
router.use('/product', productRoutes);
router.use('/product-subscription', organizationProductSubscriptionRoutes);

router.use('/entities', entityRoutes);
router.use('/dataSource', dataSourceRoutes);
router.use('/attributeOptions', attributeRoutes);
router.use('/files', fileRoutes);
router.use('/dataSourceVersion', dataSourceVersion);
router.use('/dataImportError', dataImportErrorRoutes);
router.use('/dashboard', dashBoardRoutes);
router.use('/widgetType', widgetTypeRoutes);
router.use('/operator', operatorRoutes);
router.use('/widgetTheme', widgetThemeRoutes);
router.use('/dashboardShare', dashboardShareRoutes);
router.use('/derivedField', derivedFieldRoutes);
router.use('/dashboardFont', dashboardFontRoutes);
router.use('/dashboardTheme', dashboardThemeRoutes);
router.use('/department', departmentRoutes);
router.use('/designation', designationRoutes);
router.use('/user-data-permission', userDataPermissionRoutes);
router.use('/download-request', downloadRequests);
router.use('/organization-visibility-setting', organizationVisibilitySettingRoutes);
router.use('/role-default-dashboard', roleDefaultDashboardRoutes);
router.use('/business-unit', businessUnitRoutes);
router.use('/central-file', centralFileRoutes);

export default router;
