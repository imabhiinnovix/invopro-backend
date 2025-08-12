import { Router } from 'express';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import {
  createDashboardTheme,
  deleteDashboardTheme,
  getDashboardThemeList,
  updateDashboardTheme,
} from '../../controllers/common/dashboardTheme.controller';

const router = Router();

router.get('/list', authenticateToken, getDashboardThemeList);
router.post('/create', authenticateToken, createDashboardTheme);
router.put('/update/:themeId', authenticateToken, updateDashboardTheme);
router.delete('/delete/:themeId', authenticateToken, deleteDashboardTheme);

export default router;
