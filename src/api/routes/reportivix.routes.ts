import { Router } from 'express';

import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import organizationRoutes from './organization.routes';
import supportRoutes from './support.routes';
import entityRoutes from './entity.routes';
import attributeRoutes from './attributeOption.routes';
import fileRoutes from './file.routes';
import dataSourceRoutes from './dataSource.routes';
import customReports from './customReport.routes';
import dataSourceVersion from './dataSourceVersion.routes';
import dataImportErrorRoutes from './dataImportError.routes';
import dashBoardRoutes from './dashboard.routes';
import widgetTypeRoutes from './widgetType.routes';
import operatorRoutes from './operator.routes';
import widgetThemeRoutes from './widgetTheme.routes';
import dashboardShareRoutes from './dashboardShare.routes';
import nlQueryRoutes from './nlQuery.routes';
// import widgetAppearanceRoutes from './WidgetAppearance';

const router = Router();

router.use('/entities', entityRoutes);
router.use('/dataSource', dataSourceRoutes);
router.use('/attributeOptions', attributeRoutes);
router.use('/files', fileRoutes);
router.use('/customReports', customReports);
router.use('/dataSourceVersion', dataSourceVersion);
router.use('/dataImportError', dataImportErrorRoutes);
router.use('/dashboard', dashBoardRoutes);
router.use('/widgetType', widgetTypeRoutes);
router.use('/operator', operatorRoutes);
router.use('/widgetTheme', widgetThemeRoutes);
router.use('/dashboardShare', dashboardShareRoutes);
router.use('/nlQuery', nlQueryRoutes);
// router.use('/widgetAppearances', widgetAppearanceRoutes);

export default router;
