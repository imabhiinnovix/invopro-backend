import { Router } from 'express';

import { RoleId } from '../../enums/role.enum';
import { roleAuthorization } from '../../middlewares/role.middleware';
import { authenticateToken } from '../../middlewares/authenticate.middleware';
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
} from '../controllers/customReport.controller';

const router = Router();

router.get('/list', authenticateToken, listCustomReports);
router.get('/listReportRequest', authenticateToken, listReportRequest);
router.get('/getVersionValue', authenticateToken, getReportVersionValuesBasedOnReportIdAndVersionValue);

router.post(
  '/generate',
  authenticateToken,
  // roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]),
  generateCustomReports
);

router.get('/download/:reportRequestId', authenticateToken, downloadReport);
router.get(
  '/reportDataOnDataSourceVersionId/:dataSourceVersionId',
  authenticateToken,
  getReportDataBasedOnDataSourceVersionId
);

router.get('/customReportDesignData/:customReportId', authenticateToken, getCustomReportDesignDetailsBasedOnReportId);
router.get('/reportDetails/:reportRequestId', authenticateToken, getReportRequestDetails);
router.get('/reportData/:dataSourceId', authenticateToken, getCustomReportDataBasedOnDataSourcedIdAndVersionValueRange);

router.get(
  '/listSettings',
  authenticateToken,
  roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]),
  getCustomReportSettings
);

router.post(
  '/updateSettings/:customReportId',
  authenticateToken,
  roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]),
  updateCustomReportSettings
);

export default router;
