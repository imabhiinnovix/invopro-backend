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

router.get('/listAllAvailableDataSourceVersionValue', authenticateToken, listAllAvailableDataSourceVersionValue);

export default router;
