import { Router } from 'express';
import {
  createPO,
  getPOList,
  getPOById,
  updatePO,
  deletePO,
  getPOSummary,
} from '../../controllers/invoicivixVendor/purchaseOrder.controller';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';

const router = Router();

router.post('/create', authenticateToken, createPO);
router.get('/list', authenticateToken, getPOList);
router.get('/summary', authenticateToken, getPOSummary);

router.get('/:poId', authenticateToken, getPOById);
router.put('/update/:poId', authenticateToken, updatePO);
router.delete('/delete/:poId', authenticateToken, deletePO);

export default router;