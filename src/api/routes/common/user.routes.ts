import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { roleAuthorization } from '../../../middlewares/role.middleware';
import {
  getUserList,
  getUserById,
  adminGetUserById,
  createUser,
  updateCurrentUser,
  deleteUser,
  changePassword,
  adminUpdateUser,
  getCurrentUserProfileImage,
  deleteCurrentUserProfileImage,
} from '../../controllers/common/user.controller';
import { RoleId } from '../../../enums/role.enum';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';
import { getCurrentDataSourceVersion } from '../../../database/services/common/dataSourceVersion.services';

const router = Router();

router.post('/create', authenticateToken, permissionMiddleware(), createUser);

router.get('/list', authenticateToken, permissionMiddleware(), getUserList);

router.get('/get-current-user', authenticateToken, permissionMiddleware(), getUserById);

router.get('/image', authenticateToken, permissionMiddleware(), getCurrentUserProfileImage);

router.delete('/image', authenticateToken, permissionMiddleware(), deleteCurrentUserProfileImage);

router.get('/:userId', authenticateToken, permissionMiddleware(), adminGetUserById);

router.put('/update-current-user', authenticateToken, permissionMiddleware(), updateCurrentUser);

router.put('/change-password', authenticateToken, permissionMiddleware(), changePassword);

router.put('/update/:userId', authenticateToken, permissionMiddleware(), adminUpdateUser);

router.delete('/delete/:userId', authenticateToken, permissionMiddleware(), deleteUser);

export default router;
