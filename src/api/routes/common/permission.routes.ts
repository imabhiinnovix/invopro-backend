import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';

import { getPermissionList } from '../../controllers/common/permission.controller';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

const router = Router();

router.get('/list', authenticateToken, permissionMiddleware(), getPermissionList);

export default router;
