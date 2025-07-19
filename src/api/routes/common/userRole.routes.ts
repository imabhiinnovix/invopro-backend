import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { roleAuthorization } from '../../../middlewares/role.middleware';
import { RoleId } from '../../../enums/role.enum';
import {
  createUserRole,
  deleteUserRole,
  getUserRoleList,
  updateUserRole,
} from '../../controllers/common/userRole.controller';

const router = Router();

router.get('/list', authenticateToken, getUserRoleList);
router.put('/create', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN]), createUserRole);
router.post('/update', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN]), updateUserRole);
router.delete('/delete/:roleId', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN]), deleteUserRole);

export default router;
