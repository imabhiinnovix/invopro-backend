import { Router } from 'express';
import { authenticateToken } from '../../middlewares/authenticate.middleware';
import {
  createDashboard,
  createWidget,
  deleteDashboard,
  deleteWidget,
  getDashboardById,
  getDashboards,
  getDashboardWidgetList,
  getWidgetData,
  saveDashboardWidgets,
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
router.post('/widget/getWidgetData', authenticateToken, getWidgetData);
router.post('/widget/create', authenticateToken, createWidget);
router.post('/widget/save', authenticateToken, saveDashboardWidgets);
router.post('/widget/update/:dashboardWidgetId', authenticateToken, updateWidget);
router.post('/widget/delete/:dashboardWidgetId', authenticateToken, deleteWidget);

export default router;
