import { Router } from 'express';
import reportivixRoutes from './reportivix.routes';
import notivixRoutes from './notivix.routes';
import commonRoutes from './common.routes';
import { checkProductPermissionMiddleware } from '../../middlewares/permission.middleware';
import { authenticateToken } from '../../middlewares/authenticate.middleware';

const router = Router();

router.use('/common', commonRoutes);
router.use('/reportivix', authenticateToken, checkProductPermissionMiddleware('reportivix'), reportivixRoutes);
router.use('/notivix', authenticateToken, checkProductPermissionMiddleware('notivix'), notivixRoutes);

export default router;
