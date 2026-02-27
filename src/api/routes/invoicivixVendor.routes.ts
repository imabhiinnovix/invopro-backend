import { Router } from 'express';
import vendorRoutes from './invoicivixVendor/vendor.route';
import engagementLetterRoutes from './invoicivixVendor/engagementLetter.route';
import legalDocumentRoutes from './invoicivixVendor/legalDocument.route';

const router = Router();


router.use('/vendor', vendorRoutes);
router.use('/engagement-letter', engagementLetterRoutes);
router.use('/legal-document', legalDocumentRoutes);

export default router;
