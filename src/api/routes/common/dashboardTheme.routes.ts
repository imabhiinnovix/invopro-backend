import { Router } from 'express';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import {
  createDashboardTheme,
  deleteDashboardTheme,
  getDashboardThemeList,
  updateDashboardTheme,
} from '../../controllers/common/dashboardTheme.controller';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

const router = Router();

router.get('/list', authenticateToken, permissionMiddleware(), getDashboardThemeList);
router.post('/create', authenticateToken, permissionMiddleware(), createDashboardTheme);
router.put('/update/:themeId', authenticateToken, permissionMiddleware(), updateDashboardTheme);
router.delete('/delete/:themeId', authenticateToken, permissionMiddleware(), deleteDashboardTheme);

export default router;
