import { Router } from 'express';
import commonRoutes from './common.routes';
import invoicivixVendorRoutes from './invoicivixVendor.routes';
import { checkProductPermissionMiddleware } from '../../middlewares/permission.middleware';
import { authenticateToken } from '../../middlewares/authenticate.middleware';

const router = Router();

router.use('/common', commonRoutes);
router.use('/invoicivix-vendor', invoicivixVendorRoutes);


export default router;
