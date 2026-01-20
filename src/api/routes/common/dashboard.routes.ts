import { Router } from 'express';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';
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
  selectDashboardTheme,
  getPlotTypes,
  createImageWidget,
  getDashboardNameList,
} from '../../controllers/common/dashboard.controller';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';
import { uploadSingleFile } from '../../../middlewares/upload.middleware';

const router = Router();

router.get('/list', authenticateToken, permissionMiddleware(), getDashboards);
router.get('/get/:dashboardId', authenticateToken, permissionMiddleware(), getDashboardById);
router.post('/create', authenticateToken, permissionMiddleware(), createDashboard);
router.post('/update/:dashboardId', authenticateToken, permissionMiddleware(), updateDashboard);
router.post('/delete/:dashboardId', authenticateToken, permissionMiddleware(), deleteDashboard);
router.post('/selectTheme/:dashboardId', authenticateToken, permissionMiddleware(), selectDashboardTheme);

// Dashboard widget
router.get('/widget/getWidgets/:dashboardId', authenticateToken, permissionMiddleware(), getDashboardWidgetList);
router.post('/widget/getWidgetData', authenticateToken, permissionMiddleware(), getWidgetData);
router.post('/widget/create', authenticateToken, permissionMiddleware(), createWidget);
router.post('/widget/save', authenticateToken, permissionMiddleware(), saveDashboardWidgets);
router.post('/widget/update/:dashboardWidgetId', authenticateToken, permissionMiddleware(), updateWidget);
router.post('/widget/delete/:dashboardWidgetId', authenticateToken, permissionMiddleware(), deleteWidget);
router.get('/widget/getPlotTypes', authenticateToken, permissionMiddleware(), getPlotTypes);
router.post('/image-widget/save', authenticateToken, uploadSingleFile, createImageWidget);
router.get('/name-list', authenticateToken, getDashboardNameList);



export default router;
