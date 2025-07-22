import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import {
  downloadReport,
  generateCustomReports,
  getCustomReportDataBasedOnDataSourcedIdAndVersionValueRange,
  getReportRequestDetails,
  getReportVersionValuesBasedOnReportIdAndVersionValue,
  listCustomReports,
  listReportRequest,
  getReportDataBasedOnDataSourceVersionId,
  getCustomReportDesignDetailsBasedOnReportId,
  getCustomReportSettings,
  updateCustomReportSettings,
} from '../../controllers/reportivix/customReport.controller';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

const router = Router();

router.get('/list', authenticateToken, permissionMiddleware(), listCustomReports);
router.get('/listReportRequest', authenticateToken, permissionMiddleware(), listReportRequest);
router.get(
  '/getVersionValue',
  authenticateToken,
  permissionMiddleware(),
  getReportVersionValuesBasedOnReportIdAndVersionValue
);

router.post('/generate', authenticateToken, permissionMiddleware(), generateCustomReports);

router.get('/download/:reportRequestId', authenticateToken, permissionMiddleware(), downloadReport);
router.get(
  '/reportDataOnDataSourceVersionId/:dataSourceVersionId',
  authenticateToken,
  permissionMiddleware(),
  getReportDataBasedOnDataSourceVersionId
);

router.get(
  '/customReportDesignData/:customReportId',
  authenticateToken,
  permissionMiddleware(),
  getCustomReportDesignDetailsBasedOnReportId
);
router.get('/reportDetails/:reportRequestId', authenticateToken, permissionMiddleware(), getReportRequestDetails);
router.get(
  '/reportData/:dataSourceId',
  authenticateToken,
  permissionMiddleware(),
  getCustomReportDataBasedOnDataSourcedIdAndVersionValueRange
);

router.get('/listSettings', authenticateToken, permissionMiddleware(), getCustomReportSettings);

router.post('/updateSettings/:customReportId', authenticateToken, permissionMiddleware(), updateCustomReportSettings);

export default router;
