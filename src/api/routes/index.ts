import { Router } from 'express';
import commonRoutes from './common.routes';
import { checkProductPermissionMiddleware } from '../../middlewares/permission.middleware';
import { authenticateToken } from '../../middlewares/authenticate.middleware';

const router = Router();

router.use('/common', commonRoutes);


export default router;
