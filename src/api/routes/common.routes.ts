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
