import { Router } from 'express';

import { RoleId } from '../../enums/role.enum';
import { roleAuthorization } from '../../middlewares/role.middleware';
import { authenticateToken } from '../../middlewares/authenticate.middleware';

import {
  checkDataSourceCodeAvailableOrNot,
  createDataSourcce,
  listDataSource,
  updateDataSource,
} from '../controllers/dataSource.controller';

const router = Router();

router.get('/code/:code', authenticateToken, checkDataSourceCodeAvailableOrNot);

router.post('/create', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]), createDataSourcce);
router.put(
  '/update/:dataSourceId',
  authenticateToken,
  roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]),
  updateDataSource
);

router.get('/list', authenticateToken, listDataSource);

export default router;
