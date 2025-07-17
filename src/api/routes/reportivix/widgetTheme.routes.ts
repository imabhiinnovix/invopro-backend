import { Router } from 'express';
import {
  createWidgetTheme,
  getAllWidgetThemes,
  getWidgetThemeById,
  updateWidgetTheme,
  deleteWidgetTheme,
  duplicateWidgetTheme,
  // selectThemeForDashboard,
} from '../../controllers/reportivix/widgetTheme.controller';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { roleAuthorization } from '../../../middlewares/role.middleware';
import { RoleId } from '../../../enums/role.enum';

const router = Router();

// Theme management routes (admin only)
router.get('/list', authenticateToken, getAllWidgetThemes);
router.get('/:widgetThemeId', authenticateToken, getWidgetThemeById);

router.post('/create', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]), createWidgetTheme);
router.post(
  '/duplicate/:widgetThemeId',
  authenticateToken,
  roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]),
  duplicateWidgetTheme
);

router.post(
  '/update/:widgetThemeId',
  authenticateToken,
  roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]),
  updateWidgetTheme
);

router.post(
  '/delete/:widgetThemeId',
  authenticateToken,
  roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]),
  deleteWidgetTheme
);

// Theme selection route (all authenticated users)
// router.post('/select', authenticateToken, selectThemeForDashboard);

export default router;
