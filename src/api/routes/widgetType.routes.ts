import { Router } from 'express';
import { authenticateToken } from '../../middlewares/authenticate.middleware';
import {
  createWidget,
  updateWidgetType,
  deleteWidgetType,
  getWidgetTypeById,
  getWidgets,
} from '../controllers/widgetType.controller';
import { roleAuthorization } from '../../middlewares/role.middleware';
import { RoleId } from '../../enums/role.enum';

const router = Router();

router.post('/create', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN]), createWidget);
router.post('/update/:widgetTypeId', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN]), updateWidgetType);
router.post('/delete/:widgetTypeId', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN]), deleteWidgetType);
router.get('/get/:widgetTypeId', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN]), getWidgetTypeById);
router.get('/list', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN]), getWidgets);

export default router;
