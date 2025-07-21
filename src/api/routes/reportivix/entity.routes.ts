import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { createEntity, getEntityById, listEntity, updateEntity } from '../../controllers/reportivix/entity.controller';

const router = Router();

router.post('/create', authenticateToken, createEntity);
router.put('/update/:entityId', authenticateToken, updateEntity);
router.get('/list', authenticateToken, listEntity);
router.get('/:entityId', authenticateToken, getEntityById);

export default router;
