import { Router } from 'express';

import authRoutes from './common/auth.routes';
import userRoutes from './common/user.routes';
import organizationRoutes from './common/organization.routes';
import supportRoutes from './common/support.routes';
import permissionRoutes from './common/permission.routes';
import userRoleRoutes from './common/userRole.routes';
import organizationProductSubscriptionRoutes from './common/organizationProductSubscription.routes';
import productRoutes from './common/product.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/organization', organizationRoutes);
router.use('/support', supportRoutes);
router.use('/permission', permissionRoutes);
router.use('/userRole', userRoleRoutes);
router.use('/product', organizationProductSubscriptionRoutes);
router.use('/organizationProduct', productRoutes);

export default router;
