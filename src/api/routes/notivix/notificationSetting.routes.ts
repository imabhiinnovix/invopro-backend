import { Router } from 'express';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';
import {
  createNotificationType,
  updateNotificationType,
  deleteNotificationType,
  listNotificationType,
  getNotificationType,

} from '../../controllers/notivix/notificationType.controller';

import {
  createNotificationFrequency,
  updateNotificationFrequency,
  deleteNotificationFrequency,
  listNotificationFrequency,
  getNotificationFrequency,

} from '../../controllers/notivix/notificationFrequency.controller';

const router = Router();

// Notification Types
router.post('/type/create', permissionMiddleware(), createNotificationType);
router.put('/type/update/:id', permissionMiddleware(), updateNotificationType);
router.delete('/type/delete/:id', permissionMiddleware(), deleteNotificationType);
router.get('/type/list', permissionMiddleware(), listNotificationType);
router.get('/type/:id', permissionMiddleware(), getNotificationType);

// Notification Frequency Settings
router.post('/frequency/create', permissionMiddleware(), createNotificationFrequency);
router.put('/frequency/update/:id', permissionMiddleware(), updateNotificationFrequency);
router.delete('/frequency/delete/:id', permissionMiddleware(), deleteNotificationFrequency);
router.get('/frequency/list', permissionMiddleware(), listNotificationFrequency);
router.get('/frequency/:id', permissionMiddleware(), getNotificationFrequency);

export default router;
