import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';

import {
  createPermission,
  deletePermission,
  getPermissionList,
  updatePermission,
} from '../../controllers/common/permission.controller';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

const router = Router();

router.get('/list', authenticateToken, permissionMiddleware(), getPermissionList);
router.post('/create', authenticateToken, permissionMiddleware(), createPermission);
router.put('/update/:permissionId', authenticateToken, permissionMiddleware(), updatePermission);
router.delete('/delete/:permissionId', authenticateToken, permissionMiddleware(), deletePermission);
export default router;
