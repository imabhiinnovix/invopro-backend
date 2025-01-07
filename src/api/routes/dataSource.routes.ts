import { Router } from 'express';

import { RoleId } from '../../enums/role.enum';
import { roleAuthorization } from '../../middlewares/role.middleware';
import { authenticateToken } from '../../middlewares/authenticate.middleware';

import { createDataSourcce, listDataSource } from '../controllers/dataSource.controller';

const router = Router();

router.post('/create', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]), createDataSourcce);

router.get('/list', authenticateToken, listDataSource);

export default router;
