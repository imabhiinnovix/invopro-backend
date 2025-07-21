import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';

import { createPermission, getPermissionList } from '../../controllers/common/permission.controller';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

const router = Router();

router.get('/list', authenticateToken, permissionMiddleware(), getPermissionList);
router.post('/create', authenticateToken, permissionMiddleware(), createPermission);

export default router;
