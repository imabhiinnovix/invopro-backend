import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

import {
  createDefaultDashboard,
  updateDefaultDashboard,
  deleteDefaultDashboard,
  listDefaultDashboards,
} from '../../controllers/common/roleDefaultDashboard.controller';

const router = Router();

/**
 *  CREATE default dashboard for role
 * Body: { roleId, dashboardId }
 */
router.post(
  '/create',
  authenticateToken,
  permissionMiddleware(),
  createDefaultDashboard
);

/**
 *  UPDATE default dashboard for role
 * Body: { roleId, dashboardId }
 */
router.put(
  '/update/:roleId',
  authenticateToken,
  permissionMiddleware(),
  updateDefaultDashboard
);

/**
 *  LIST all role default dashboards (org-wise)
 */
router.get(
  '/list',
  authenticateToken,
  permissionMiddleware(),
  listDefaultDashboards
);

/**
 *  DELETE default dashboard for role
 * Params: roleId
 */
router.delete(
  '/delete/:roleId',
  authenticateToken,
  permissionMiddleware(),
  deleteDefaultDashboard
);

export default router;