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

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/organizations', organizationRoutes);
router.use('/support', supportRoutes);
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

export default router;
