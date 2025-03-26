import { Router } from 'express';
import { authenticateToken } from '../../middlewares/authenticate.middleware';
import { createDashboard, deleteDashboard, getDashboardById, getDashboards, updateDashboard } from '../controllers/dashboard.controller';

const router = Router();

router.post('/create', authenticateToken, createDashboard);
router.post('/update/:dashboardId', authenticateToken, updateDashboard);
router.post('/delete/:dashboardId', authenticateToken, deleteDashboard)
router.get('/get/:dashboardId', authenticateToken, getDashboardById);
router.get('/list', authenticateToken, getDashboards)

export default router;
