import { Router } from 'express';
import {
  createWidgetTheme,
  getAllWidgetThemes,
  getWidgetThemeById,
  updateWidgetTheme,
  deleteWidgetTheme,
  duplicateWidgetTheme,
  // selectThemeForDashboard,
} from '../../controllers/common/widgetTheme.controller';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

const router = Router();

// Theme management routes (admin only)
router.get('/list', authenticateToken, permissionMiddleware(), getAllWidgetThemes);
router.get('/:widgetThemeId', authenticateToken, permissionMiddleware(), getWidgetThemeById);

router.post('/create', authenticateToken, permissionMiddleware(), createWidgetTheme);
router.post('/duplicate/:widgetThemeId', authenticateToken, permissionMiddleware(), duplicateWidgetTheme);

router.post('/update/:widgetThemeId', authenticateToken, permissionMiddleware(), updateWidgetTheme);

router.post('/delete/:widgetThemeId', authenticateToken, permissionMiddleware(), deleteWidgetTheme);

// Theme selection route (all authenticated users)
// router.post('/select', authenticateToken, selectThemeForDashboard);

export default router;
