import { Router } from 'express';

import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import organizationRoutes from './organization.routes';
import supportRoutes from './support.routes';
import entityRoutes from './entity.routes';
import attributeRoutes from './attributeOption.routes';
import fileRoutes from './file.routes';
import dataSourceRoutes from './dataSource.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/organizations', organizationRoutes);
router.use('/support', supportRoutes);
router.use('/entities', entityRoutes);
router.use('/dataSource', dataSourceRoutes);
router.use('/attributeOptions', attributeRoutes);
router.use('/files', fileRoutes);

export default router;
