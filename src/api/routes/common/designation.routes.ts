import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';

import { permissionMiddleware } from '../../../middlewares/permission.middleware';
import {
  createDesignation,
  deleteDesignation,
  getDesignationList,
  updateDesignation,
} from '../../controllers/common/designation.controller';

const router = Router();

router.post('/create', authenticateToken, permissionMiddleware(), createDesignation);
router.put('/update/:designationId', authenticateToken, permissionMiddleware(), updateDesignation);
router.get('/list', authenticateToken, permissionMiddleware(), getDesignationList);
router.get('/delete/:designationId', authenticateToken, permissionMiddleware(), deleteDesignation);

export default router;
