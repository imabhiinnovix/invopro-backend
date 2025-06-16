import { Router } from 'express';

import { RoleId } from '../../enums/role.enum';
import { roleAuthorization } from '../../middlewares/role.middleware';
import { authenticateToken } from '../../middlewares/authenticate.middleware';
import { runNaturalLanguageAggregation, runNaturalLanguageInsights } from '../controllers/nlQuery.controller';

const router = Router();

router.get(
  '/getData',
  authenticateToken,
  roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]),
  runNaturalLanguageAggregation
);
router.get(
  '/insights',
  authenticateToken,
  roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]),
  runNaturalLanguageInsights
);

export default router;
