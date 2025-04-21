import { Router } from 'express';

import { authenticateToken } from '../../middlewares/authenticate.middleware';
import {
  checkDataSourceVersionNameAvailableOrNot,
  createUpdateCustomDataSourceVersionValue,
  getDataSourceVersionDataBasedOnDataSourceIdAndVersionValue,
  getLatestDataSourceVersionDetailBasedOnCustomReportIdAndVersionValue,
  listDataSourceVersion,
} from '../controllers/dataSourceVersion.controller';

const router = Router();

router.get('/list', authenticateToken, listDataSourceVersion);

router.get(
  '/dataSourceId/:dataSourceId/versionValue/:versionValue/versionName/:versionName',
  authenticateToken,
  checkDataSourceVersionNameAvailableOrNot
);

router.post('/create', authenticateToken, createUpdateCustomDataSourceVersionValue);

router.get('/versionData', authenticateToken, getDataSourceVersionDataBasedOnDataSourceIdAndVersionValue);
router.get(
  '/listVersionData/:customReportId',
  authenticateToken,
  getLatestDataSourceVersionDetailBasedOnCustomReportIdAndVersionValue
);

export default router;
