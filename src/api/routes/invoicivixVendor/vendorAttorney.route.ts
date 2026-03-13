import { Router } from 'express';
import {
  createVendorAttorney,
  getVendorAttorneyById,
  updateVendorAttorney,
  deleteVendorAttorney,
  getVendorAttorneyList
} from '../../controllers/invoicivixVendor/vendorAttorney.controller';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';

const router = Router();

router.get('/list', authenticateToken, getVendorAttorneyList);
router.post('/create', authenticateToken, createVendorAttorney);
router.put('/update/:attorneyId', authenticateToken, updateVendorAttorney);
router.delete('/delete/:attorneyId', authenticateToken, deleteVendorAttorney);
router.get('/:attorneyId', authenticateToken, getVendorAttorneyById);

export default router;