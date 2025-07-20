import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { roleAuthorization } from '../../../middlewares/role.middleware';
import { RoleId } from '../../../enums/role.enum';
import {
  createUserRole,
  deleteUserRole,
  getRolePermissionList,
  getUserRoleList,
  updateUserRole,
} from '../../controllers/common/userRole.controller';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

const router = Router();

router.get('/list', authenticateToken, permissionMiddleware(), getUserRoleList);
router.get('/:roleId', authenticateToken, permissionMiddleware(), getRolePermissionList);
router.post('/create', authenticateToken, permissionMiddleware(), createUserRole);
router.put('/update/:roleId', authenticateToken, permissionMiddleware(), updateUserRole);
router.delete('/delete/:roleId', authenticateToken, permissionMiddleware(), deleteUserRole);

export default router;
