import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { roleAuthorization } from '../../../middlewares/role.middleware';
import {
  getUserList,
  getUserById,
  adminGetUserById,
  createUser,
  // updateUser,
  // deleteUser,
  // changePassword,
  // adminGetUserById,
  // adminUpdateUser,
  // updateUserStatus,
} from '../../controllers/common/user.controller';
import { RoleId } from '../../../enums/role.enum';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

const router = Router();

router.post('/create', authenticateToken, permissionMiddleware(), createUser);

router.get('/list', authenticateToken, permissionMiddleware(), getUserList);

router.get('/getCurrentUser', authenticateToken, permissionMiddleware(), getUserById);

router.get('/:userId', authenticateToken, permissionMiddleware(), adminGetUserById);

// router.post('/update', authenticateToken, updateUser);

// router.post('/change-password', authenticateToken, changePassword);

// router.post(
//   '/updateStatus/:userId',
//   authenticateToken,
//   roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]),
//   updateUserStatus
// );

// router.post(
//   '/update/:userId',
//   authenticateToken,
//   roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]),
//   adminUpdateUser
// );

// router.post('/delete/:userId', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]), deleteUser);

export default router;
