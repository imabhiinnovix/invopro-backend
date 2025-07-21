import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import {
  updateAttribute,
  createAttribute,
  getAttributeOptionById,
  listAttribute,
} from '../../controllers/reportivix/attributeOptions.controller';

const router = Router();

router.post('/create', authenticateToken, createAttribute);
router.put('/update/:attributeId', authenticateToken, updateAttribute);
router.get('/list', authenticateToken, listAttribute);
router.get('/get/:attributeId', authenticateToken, getAttributeOptionById);

export default router;
