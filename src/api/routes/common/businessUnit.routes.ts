import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

import {
  createBusinessUnit,
  deleteBusinessUnit,
  getBusinessUnitList,
  updateBusinessUnit,
} from '../../controllers/common/businessUnit.controller';

const router = Router();

router.post(
  '/create',
  authenticateToken,
  permissionMiddleware(),
  createBusinessUnit
);

router.put(
  '/update/:businessUnitId',
  authenticateToken,
  permissionMiddleware(),
  updateBusinessUnit
);

router.get(
  '/list',
  authenticateToken,
  permissionMiddleware(),
  getBusinessUnitList
);

router.delete(
  '/delete/:businessUnitId',
  authenticateToken,
  permissionMiddleware(),
  deleteBusinessUnit
);

export default router;