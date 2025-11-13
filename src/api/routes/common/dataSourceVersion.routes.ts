import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import {
  checkDataSourceVersionNameAvailableOrNot,
  createSingleRowVersionValue,
  createUpdateCustomDataSourceVersionValue,
  deleteMultipleRowsFromVersion,
  exportDataSourceVersionDataToExcel,
  getDataSourceVersionDataBasedOnDataSourceIdAndVersionValue,
  getDataSourceVersionDetailsBasedOnId,
  getLatestDataSourceVersionDetailBasedOnCustomReportIdAndVersionValue,
  // getNewChartData,
  listAllAvailableDataSourceVersionValue,
  listDataSourceVersion,
  updateSingleRowVersionValue,
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

// Create new version value row
router.post('/versionData/create', authenticateToken, permissionMiddleware(), createSingleRowVersionValue);

// Update existing version value row
router.put('/versionData/update/:rowId', authenticateToken, permissionMiddleware(), updateSingleRowVersionValue);

//Delete single/multiple version value row
router.delete('/versionData/delete', authenticateToken, permissionMiddleware(), deleteMultipleRowsFromVersion);

router.get(
  '/versionData',
  authenticateToken,
  permissionMiddleware(),
  getDataSourceVersionDataBasedOnDataSourceIdAndVersionValue
);

router.get(
  '/versionData/export',
  authenticateToken,
  permissionMiddleware(),
  exportDataSourceVersionDataToExcel
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

// router.post('/chartData', authenticateToken, permissionMiddleware(), getNewChartData);
router.get('/:dataSourceVersionId', authenticateToken, getDataSourceVersionDetailsBasedOnId);

export default router;
