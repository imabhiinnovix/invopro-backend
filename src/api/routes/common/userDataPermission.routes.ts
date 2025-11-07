import { Router } from 'express';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';
import {
  createUserPermission,
  updateUserPermission,
  listUserPermission,
  deleteUserPermission,
  getUserPermissionById,
} from '../../controllers/common/userDataPermission.controller';

const router = Router();

/**
 * -------------------------------------------------------
 * 🧩 User Data Permission Routes
 * -------------------------------------------------------
 */

// ✅ Create
router.post(
  '/create',
  authenticateToken,
  permissionMiddleware(),
  createUserPermission
);

// ✅ Update
router.put(
  '/update/:id',
  authenticateToken,
  permissionMiddleware(),
  updateUserPermission
);

// ✅ List (supports pagination or ?isPaginate=false)
router.get(
  '/list',
  authenticateToken,
  permissionMiddleware(),
  listUserPermission
);

// ✅ Soft Delete (status → 'in-active')
router.delete(
  '/delete/:id',
  authenticateToken,
  permissionMiddleware(),
  deleteUserPermission
);

// ✅ GET (single active record)
router.get(
  '/:id',
  authenticateToken,
  permissionMiddleware(),
  getUserPermissionById
);

export default router;