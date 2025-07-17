import { Router } from 'express';

import entityRoutes from './reportivix/entity.routes';
import attributeRoutes from './reportivix/attributeOption.routes';
import fileRoutes from './reportivix/file.routes';
import dataSourceRoutes from './reportivix/dataSource.routes';
import customReports from './reportivix/customReport.routes';
import dataSourceVersion from './reportivix/dataSourceVersion.routes';
import dataImportErrorRoutes from './reportivix/dataImportError.routes';
import dashBoardRoutes from './reportivix/dashboard.routes';
import widgetTypeRoutes from './reportivix/widgetType.routes';
import operatorRoutes from './reportivix/operator.routes';
import widgetThemeRoutes from './reportivix/widgetTheme.routes';
import dashboardShareRoutes from './reportivix/dashboardShare.routes';
import nlQueryRoutes from './reportivix/nlQuery.routes';
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
