import { Router } from 'express';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import {
  createWidget,
  updateWidgetType,
  deleteWidgetType,
  getWidgetTypeById,
  getWidgets,
} from '../../controllers/reportivix/widgetType.controller';
import { roleAuthorization } from '../../../middlewares/role.middleware';
import { RoleId } from '../../../enums/role.enum';

const router = Router();

router.post('/create', authenticateToken, createWidget);
router.post('/update/:widgetTypeId', authenticateToken, updateWidgetType);
router.post('/delete/:widgetTypeId', authenticateToken, deleteWidgetType);
router.get('/get/:widgetTypeId', authenticateToken, getWidgetTypeById);
router.get('/list', authenticateToken, getWidgets);

export default router;
