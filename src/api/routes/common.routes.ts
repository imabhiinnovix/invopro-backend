import { Router } from 'express';

import authRoutes from './common/auth.routes';
import userRoutes from './common/user.routes';
import organizationRoutes from './common/organization.routes';
import supportRoutes from './common/support.routes';
import permissionRoutes from './common/permission.routes';
import userRoleRoutes from './common/userRole.routes';
import organizationProductSubscriptionRoutes from './common/organizationProductSubscription.routes';
import productRoutes from './common/product.routes';
import dataSourceVersion from './reportivix/dataSourceVersion.routes';
import dataImportErrorRoutes from './reportivix/dataImportError.routes';
import dashBoardRoutes from './reportivix/dashboard.routes';
import widgetTypeRoutes from './reportivix/widgetType.routes';
import operatorRoutes from './reportivix/operator.routes';
import widgetThemeRoutes from './reportivix/widgetTheme.routes';
import dashboardShareRoutes from './reportivix/dashboardShare.routes';
import entityRoutes from './reportivix/entity.routes';
import attributeRoutes from './reportivix/attributeOption.routes';
import fileRoutes from './reportivix/file.routes';
import dataSourceRoutes from './reportivix/dataSource.routes';

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

export default router;
