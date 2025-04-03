import { Router } from 'express';
import { authenticateToken } from '../../middlewares/authenticate.middleware';
import {
  createDashboard,
  createWidget,
  deleteDashboard,
  getDashboardById,
  getDashboards,
  getDashboardWidgetList,
  getWidgetById,
  updateDashboard,
  updateWidget,
} from '../controllers/dashboard.controller';

const router = Router();

router.post('/create', authenticateToken, createDashboard);
router.post('/update/:dashboardId', authenticateToken, updateDashboard);
router.post('/delete/:dashboardId', authenticateToken, deleteDashboard);
router.get('/get/:dashboardId', authenticateToken, getDashboardById);
router.get('/list', authenticateToken, getDashboards);

// Dashboard widget
router.get('/widget/getWidgets/:dashboardId', authenticateToken, getDashboardWidgetList);
router.get('/widget/getWidgetById/:dashboardWidgetId', authenticateToken, getWidgetById);
router.post('/widget/create', authenticateToken, createWidget);
router.post('/widget/update/:dashboardWidgetId', authenticateToken, updateWidget);

export default router;
