import { Router } from 'express';
import reportivixRoutes from './reportivix.routes';
import commonRoutes from './common.routes';

const router = Router();

router.use('/common', commonRoutes);
router.use('/reportivix', reportivixRoutes);

export default router;
