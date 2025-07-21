import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import {
  checkDataSourceVersionNameAvailableOrNot,
  createUpdateCustomDataSourceVersionValue,
  getDataSourceVersionDataBasedOnDataSourceIdAndVersionValue,
  getLatestDataSourceVersionDetailBasedOnCustomReportIdAndVersionValue,
  listAllAvailableDataSourceVersionValue,
  listDataSourceVersion,
} from '../../controllers/common/dataSourceVersion.controller';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

const router = Router();

router.get('/list', authenticateToken, permissionMiddleware(), listDataSourceVersion);

router.get(
  '/dataSourceId/:dataSourceId/versionValue/:versionValue/versionName/:versionName',
  authenticateToken,
  permissionMiddleware(),
  checkDataSourceVersionNameAvailableOrNot
);

router.post('/create', authenticateToken, permissionMiddleware(), createUpdateCustomDataSourceVersionValue);

router.get(
  '/versionData',
  authenticateToken,
  permissionMiddleware(),
  getDataSourceVersionDataBasedOnDataSourceIdAndVersionValue
);
router.get(
  '/listVersionData/:customReportId',
  authenticateToken,
  permissionMiddleware(),
  getLatestDataSourceVersionDetailBasedOnCustomReportIdAndVersionValue
);

router.get(
  '/listAllAvailableDataSourceVersionValue',
  authenticateToken,
  permissionMiddleware(),
  listAllAvailableDataSourceVersionValue
);

export default router;
