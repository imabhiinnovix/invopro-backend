import { Router } from 'express';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import {
  deleteDashboardFontTheme,
  downloadDashboardFontTheme,
  getDashboardFontList,
} from '../../controllers/common/dashboardFont.controller';

const router = Router();

router.get('/list', authenticateToken, getDashboardFontList);
router.get('/download/:fontId', authenticateToken, downloadDashboardFontTheme);
router.delete('/delete/:fontId', authenticateToken, deleteDashboardFontTheme);

export default router;
