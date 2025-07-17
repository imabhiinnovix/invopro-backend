import { Router } from 'express';

import authRoutes from './common/auth.routes';
import userRoutes from './common/user.routes';
import organizationRoutes from './common/organization.routes';
import supportRoutes from './common/support.routes';
import permissionRoutes from './common/permission.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/organizations', organizationRoutes);
router.use('/support', supportRoutes);
router.use('/permission', permissionRoutes);

export default router;
