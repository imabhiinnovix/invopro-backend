import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { createEntity, getEntityById, listEntity, updateEntity } from '../../controllers/common/entity.controller';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

const router = Router();

router.post('/create', authenticateToken, permissionMiddleware(), createEntity);
router.put('/update/:entityId', authenticateToken, permissionMiddleware(), updateEntity);
router.get('/list', authenticateToken, permissionMiddleware(), listEntity);
router.get('/:entityId', authenticateToken, permissionMiddleware(), getEntityById);

export default router;
