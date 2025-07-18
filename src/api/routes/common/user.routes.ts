import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { roleAuthorization } from '../../../middlewares/role.middleware';
import {
  getUserList,
  getUserById,
  updateUser,
  deleteUser,
  changePassword,
  adminGetUserById,
  adminUpdateUser,
  updateUserStatus,
} from '../../controllers/common/user.controller';
import { RoleId } from '../../../enums/role.enum';
// import { createUser } from '../../controllers/common/auth.controller';

const router = Router();

// router.post('/create', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]), createUser);

router.get('/list', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]), getUserList);

router.get('/getCurrentUser', authenticateToken, getUserById);

router.post('/update', authenticateToken, updateUser);

router.post('/change-password', authenticateToken, changePassword);

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
