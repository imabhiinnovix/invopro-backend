import { Router } from 'express';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import {
  deleteDashboardFontTheme,
  downloadDashboardFontTheme,
  getDashboardFontList,
} from '../../controllers/common/dashboardFont.controller';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

const router = Router();

router.get('/list', authenticateToken, permissionMiddleware(), getDashboardFontList);
router.get('/download/:fontId', authenticateToken, permissionMiddleware(), downloadDashboardFontTheme);
router.delete('/delete/:fontId', authenticateToken, permissionMiddleware(), deleteDashboardFontTheme);

export default router;
