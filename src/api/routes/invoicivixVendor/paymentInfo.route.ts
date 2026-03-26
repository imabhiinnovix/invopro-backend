import { Router } from 'express';
import {
  createPayment,
  getPaymentById,
  updatePayment,
  deletePayment,
  getPaymentList,
  getPaymentSummary,
} from '../../controllers/invoicivixVendor/paymentInfo.controller';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { uploadMultipleFile } from '../../../middlewares/upload.middleware';

const router = Router();

router.get('/list', authenticateToken, getPaymentList);

router.post(
  '/create',
  authenticateToken,
  uploadMultipleFile,
  createPayment
);

router.put(
  '/update/:paymentId',
  authenticateToken,
  uploadMultipleFile,
  updatePayment
);

router.delete(
  '/delete/:paymentId',
  authenticateToken,
  deletePayment
);

router.get('/:paymentId', authenticateToken, getPaymentById);

router.get(
  '/summary',
  authenticateToken,
  getPaymentSummary
);

export default router;