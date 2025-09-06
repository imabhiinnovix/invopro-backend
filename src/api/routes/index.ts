import { Router } from 'express';
import reportivixRoutes from './reportivix.routes';
import notivixRoutes from './notivix.routes';
import commonRoutes from './common.routes';
import { checkProductPermissionMiddleware } from '../../middlewares/permission.middleware';
import { authenticateToken } from '../../middlewares/authenticate.middleware';
import { sendAcknowledge } from '../controllers/notivix/notificationAcknowledge.controller';

const router = Router();

router.use('/common', commonRoutes);
router.use('/reportivix', authenticateToken, checkProductPermissionMiddleware('reportivix'), reportivixRoutes);
router.use('/notivix', authenticateToken, checkProductPermissionMiddleware('notivix'), notivixRoutes);

//For Acknowledge Notification - No Authentication/Middleware
router.put('/notification-acknowledge/sendAcknowledge/:ackId', sendAcknowledge);

export default router;
