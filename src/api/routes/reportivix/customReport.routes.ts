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

router.get('/list', permissionMiddleware(), listCustomReports);
router.get('/listReportRequest', permissionMiddleware(), listReportRequest);
router.get(
  '/getVersionValue',
  permissionMiddleware(),
  getReportVersionValuesBasedOnReportIdAndVersionValue
);

router.post('/generate', permissionMiddleware(), generateCustomReports);

router.get('/download/:reportRequestId', permissionMiddleware(), downloadReport);
router.get(
  '/reportDataOnDataSourceVersionId/:dataSourceVersionId',
  permissionMiddleware(),
  getReportDataBasedOnDataSourceVersionId
);

router.get(
  '/customReportDesignData/:customReportId',
  permissionMiddleware(),
  getCustomReportDesignDetailsBasedOnReportId
);
router.get('/reportDetails/:reportRequestId', permissionMiddleware(), getReportRequestDetails);
router.get(
  '/reportData/:dataSourceId',
  permissionMiddleware(),
  getCustomReportDataBasedOnDataSourcedIdAndVersionValueRange
);

router.get('/listSettings', permissionMiddleware(), getCustomReportSettings);

router.post('/updateSettings/:customReportId', permissionMiddleware(), updateCustomReportSettings);

export default router;
