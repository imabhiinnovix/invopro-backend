import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import {
  updateAttribute,
  createAttribute,
  getAttributeOptionById,
  listAttribute,
} from '../../controllers/common/attributeOptions.controller';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

const router = Router();

router.post('/create', authenticateToken, permissionMiddleware(), createAttribute);
router.put('/update/:attributeId', authenticateToken, permissionMiddleware(), updateAttribute);
router.get('/list', authenticateToken, permissionMiddleware(), listAttribute);
router.get('/get/:attributeId', authenticateToken, permissionMiddleware(), getAttributeOptionById);

export default router;
