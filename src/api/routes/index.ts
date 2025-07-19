import { Router } from 'express';
import reportivixRoutes from './reportivix.routes';
import commonRoutes from './common.routes';
import { checkProductPermissionMiddleware } from '../../middlewares/permission.middleware';

const router = Router();

router.use('/common', commonRoutes);
router.use('/reportivix', checkProductPermissionMiddleware('reportivix'), reportivixRoutes);

export default router;
