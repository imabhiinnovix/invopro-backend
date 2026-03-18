import { Router } from 'express';
import {
  createVendorInvoice,
  getVendorInvoiceById,
  updateVendorInvoice,
  deleteVendorInvoice,
  getVendorInvoiceList
} from '../../controllers/invoicivixVendor/vendorInvoice.controller';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';

const router = Router();

router.get('/list', authenticateToken, getVendorInvoiceList);
router.post('/create', authenticateToken, createVendorInvoice);
router.put('/update/:invoiceId', authenticateToken, updateVendorInvoice);
router.delete('/delete/:invoiceId', authenticateToken, deleteVendorInvoice);
router.get('/:invoiceId', authenticateToken, getVendorInvoiceById);

export default router;