import { Router } from 'express';
import {
  createWidgetTheme,
  getAllWidgetThemes,
  getWidgetThemeById,
  updateWidgetTheme,
  deleteWidgetTheme,
  // selectThemeForDashboard,
} from '../controllers/widgetTheme.controller';
import { authenticateToken } from '../../middlewares/authenticate.middleware';
import { roleAuthorization } from '../../middlewares/role.middleware';
import { RoleId } from '../../enums/role.enum';

const router = Router();

// Theme management routes (admin only)
router.get('/list', authenticateToken, getAllWidgetThemes);
router.get('/:dashboardWidgetThemeId', authenticateToken, getWidgetThemeById);

router.post('/create', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]), createWidgetTheme);

router.post(
  '/update/:dashboardWidgetThemeId',
  authenticateToken,
  roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]),
  updateWidgetTheme
);

router.post(
  '/delete/:dashboardWidgetThemeId',
  authenticateToken,
  roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]),
  deleteWidgetTheme
);

// Theme selection route (all authenticated users)
// router.post('/select', authenticateToken, selectThemeForDashboard);

export default router;
