import { Router } from 'express';

import { authenticateToken } from '../../middlewares/authenticate.middleware';
import { roleAuthorization } from '../../middlewares/role.middleware';
import {
  getUserList,
  getUserById,
  updateUser,
  deleteUser,
  changePassword,
  adminGetUserById,
  adminUpdateUser,
  updateUserStatus,
} from '../controllers/user.controller';
import { RoleId } from '../../enums/role.enum';

const router = Router();

router.get('/getCurrentUser', authenticateToken, getUserById);

router.post('/update', authenticateToken, updateUser);

router.post('/change-password', authenticateToken, changePassword);

// Admin
router.get('/list', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]), getUserList);

router.get('/:userId', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]), adminGetUserById);

router.post(
  '/updateStatus/:userId',
  authenticateToken,
  roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]),
  updateUserStatus
);

router.post(
  '/update/:userId',
  authenticateToken,
  roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]),
  adminUpdateUser
);

router.post('/delete/:userId', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]), deleteUser);

export default router;
