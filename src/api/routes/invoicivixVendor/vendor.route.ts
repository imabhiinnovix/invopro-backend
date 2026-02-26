import { Router } from 'express';
import {
  createVendor,
  getVendorById,
  updateVendor,
  deleteVendor,
  getVendorList,
} from '../../controllers/invoicivixVendor/vendor.controller';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';
import { uploadMultipleFile } from '../../../middlewares/upload.middleware';

const router = Router();

router.get('/list', 
    authenticateToken, 
    // permissionMiddleware(), 
    getVendorList
);

router.post(
  '/create',
  authenticateToken,
//   permissionMiddleware(),
  uploadMultipleFile,
  createVendor
);

router.put(
  '/update/:vendorId',
  authenticateToken,
//   permissionMiddleware(),
  uploadMultipleFile,
  updateVendor
);

router.delete(
  '/delete/:vendorId',
  authenticateToken,
//   permissionMiddleware(),
  deleteVendor
);

router.get('/:vendorId', 
    authenticateToken, 
    // permissionMiddleware(), 
    getVendorById
);

export default router;