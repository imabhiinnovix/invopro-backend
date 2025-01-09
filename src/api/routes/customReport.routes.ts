import { Router } from 'express';

import { RoleId } from '../../enums/role.enum';
import { roleAuthorization } from '../../middlewares/role.middleware';
import { authenticateToken } from '../../middlewares/authenticate.middleware';
import { generateMonthlyIpReport } from '../controllers/customReport.controller';

const router = Router();

router.post(
  '/monthlyip',
  authenticateToken,
  roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]),
  generateMonthlyIpReport
);

export default router;
