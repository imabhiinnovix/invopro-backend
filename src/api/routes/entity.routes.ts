import { Router } from 'express';

import { RoleId } from '../../enums/role.enum';
import { roleAuthorization } from '../../middlewares/role.middleware';
import { authenticateToken } from '../../middlewares/authenticate.middleware';
import { createEntity, listEntity } from '../controllers/entity.controller';

const router = Router();

router.post('/create', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]), createEntity);
router.get('/list', authenticateToken, listEntity);

export default router;
