import { Router } from 'express';
import {
  createVendorInvoice,
  getVendorInvoiceById,
  deleteVendorInvoice,
  getVendorInvoiceList,
} from '../../controllers/invoicivixVendor/vendorInvoice.controller';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
// import { permissionMiddleware } from '../../../middlewares/permission.middleware';
import { uploadMultipleFile } from '../../../middlewares/upload.middleware';

const router = Router();

// ✅ List all vendor invoices
router.get(
  '/list',
  authenticateToken,
  // permissionMiddleware(),
  getVendorInvoiceList
);

// ✅ Upload one or multiple vendor invoice PDFs
router.post(
  '/create',
  authenticateToken,
  // permissionMiddleware(),
  uploadMultipleFile,
  createVendorInvoice
);

// ✅ Update (if needed to replace a PDF file)
router.put(
  '/update/:invoiceId',
  authenticateToken,
  // permissionMiddleware(),
  uploadMultipleFile,
  createVendorInvoice // or separate update controller if required
);

// ✅ Delete vendor invoice (soft delete + remove file)
router.delete(
  '/delete/:invoiceId',
  authenticateToken,
  // permissionMiddleware(),
  deleteVendorInvoice
);

// ✅ Get vendor invoice by ID
router.get(
  '/:invoiceId',
  authenticateToken,
  // permissionMiddleware(),
  getVendorInvoiceById
);

export default router;