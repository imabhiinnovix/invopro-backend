import { Router } from 'express';

import { RoleId } from '../../enums/role.enum';
import { roleAuthorization } from '../../middlewares/role.middleware';
import { authenticateToken } from '../../middlewares/authenticate.middleware';
import { createAttribute, listAttribute } from '../controllers/attributeOptions.controller';

const router = Router();

router.post('/create', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]), createAttribute);
router.get('/list', authenticateToken, listAttribute);

export default router;
