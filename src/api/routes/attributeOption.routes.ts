import { Router } from 'express';

import { RoleId } from '../../enums/role.enum';
import { roleAuthorization } from '../../middlewares/role.middleware';
import { authenticateToken } from '../../middlewares/authenticate.middleware';
import {
  createAttribute,
  getAttributeOptionById,
  listAttribute,
  updateAttribute,
} from '../controllers/attributeOptions.controller';

const router = Router();

router.post('/create', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]), createAttribute);
router.post(
  '/update/:attributeId',
  authenticateToken,
  roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]),
  updateAttribute
);
router.get('/list', authenticateToken, listAttribute);
router.get('/get/:attributeId', authenticateToken, getAttributeOptionById);

export default router;
