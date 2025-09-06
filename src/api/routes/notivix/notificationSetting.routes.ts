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

import {
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  listNotificationTemplate,
  getNotificationTemplate,

} from '../../controllers/notivix/notificationTemplate.controller';

import {
  createNotificationMedium,
  updateNotificationMedium,
  deleteNotificationMedium,
  listNotificationMediums,
  getNotificationMedium,

} from '../../controllers/notivix/notificationMedium.controller';
import { uploadMultipleFile } from '../../../middlewares/upload.middleware';
import { triggerPrepareTodayNotifications } from '../../controllers/notivix/notificationPrepared.controller';

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

// Notification Template Settings
router.post('/template/create', permissionMiddleware(), uploadMultipleFile, createNotificationTemplate);
router.put('/template/update/:id', permissionMiddleware(), uploadMultipleFile, updateNotificationTemplate);
router.delete('/template/delete/:id', permissionMiddleware(), deleteNotificationTemplate);
router.get('/template/list', permissionMiddleware(), listNotificationTemplate);
router.get('/template/:id', permissionMiddleware(), getNotificationTemplate);

// Notification Medium Settings
router.post('/medium/create', permissionMiddleware(), createNotificationMedium);
router.put('/medium/update/:id', permissionMiddleware(), updateNotificationMedium);
router.delete('/medium/delete', permissionMiddleware(), deleteNotificationMedium);
router.get('/medium/list', permissionMiddleware(), listNotificationMediums);
router.get('/medium/:id', permissionMiddleware(), getNotificationMedium);

router.post("/prepared/trigger", triggerPrepareTodayNotifications);

export default router;
