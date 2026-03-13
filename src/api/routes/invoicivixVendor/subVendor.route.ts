import { Router } from 'express';
import {
  createSubVendor,
  getSubVendorById,
  updateSubVendor,
  deleteSubVendor,
  getSubVendorList
} from '../../controllers/invoicivixVendor/subVendor.controller';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { uploadMultipleFile } from '../../../middlewares/upload.middleware';

const router = Router();

// Get list of sub vendors with pagination and search
router.get('/list', authenticateToken, getSubVendorList);

// Create a new sub vendor (supports logo upload)
router.post('/create', authenticateToken, uploadMultipleFile, createSubVendor);

// Update existing sub vendor by ID (supports logo upload)
router.put('/update/:subVendorId', authenticateToken, uploadMultipleFile, updateSubVendor);

// Soft delete sub vendor by ID
router.delete('/delete/:subVendorId', authenticateToken, deleteSubVendor);

// Get single sub vendor by ID
router.get('/:subVendorId', authenticateToken, getSubVendorById);

export default router;