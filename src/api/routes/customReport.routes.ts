import { Router } from 'express';

import { RoleId } from '../../enums/role.enum';
import { roleAuthorization } from '../../middlewares/role.middleware';
import { authenticateToken } from '../../middlewares/authenticate.middleware';
import { generateCustomReports, listCustomReports } from '../controllers/customReport.controller';

const router = Router();

router.get('/list', authenticateToken, listCustomReports);
router.post(
  '/generate',
  authenticateToken,
  // roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]),
  generateCustomReports
);

export default router;
