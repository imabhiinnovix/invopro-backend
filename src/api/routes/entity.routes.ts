import { Router } from 'express';

import { RoleId } from '../../enums/role.enum';
import { roleAuthorization } from '../../middlewares/role.middleware';
import { authenticateToken } from '../../middlewares/authenticate.middleware';
import { createEntity, getEntityById, listEntity, updateEntity } from '../controllers/entity.controller';

const router = Router();

router.post('/create', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]), createEntity);
router.put('/update/:entityId', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]), updateEntity);
router.get('/list', authenticateToken, listEntity);
router.get('/:entityId', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]), getEntityById);

export default router;
