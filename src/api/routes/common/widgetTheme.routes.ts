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

const router = Router();

// Theme management routes (admin only)
router.get('/list', authenticateToken, getAllWidgetThemes);
router.get('/:widgetThemeId', authenticateToken, getWidgetThemeById);

router.post('/create', authenticateToken, createWidgetTheme);
router.post('/duplicate/:widgetThemeId', authenticateToken, duplicateWidgetTheme);

router.post('/update/:widgetThemeId', authenticateToken, updateWidgetTheme);

router.post('/delete/:widgetThemeId', authenticateToken, deleteWidgetTheme);

// Theme selection route (all authenticated users)
// router.post('/select', authenticateToken, selectThemeForDashboard);

export default router;
