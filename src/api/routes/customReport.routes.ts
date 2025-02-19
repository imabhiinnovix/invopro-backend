import { Router } from 'express';

import { RoleId } from '../../enums/role.enum';
import { roleAuthorization } from '../../middlewares/role.middleware';
import { authenticateToken } from '../../middlewares/authenticate.middleware';
import {
  downloadReport,
  generateCustomReports,
  listCustomReports,
  listReportRequest,
} from '../controllers/customReport.controller';

const router = Router();

router.get('/list', authenticateToken, listCustomReports);
router.get('/listReportRequest', authenticateToken, listReportRequest);
router.post(
  '/generate',
  authenticateToken,
  // roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]),
  generateCustomReports
);

router.get('/download/:reportRequestId', authenticateToken, downloadReport);
export default router;
