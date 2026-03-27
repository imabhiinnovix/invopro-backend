import { Router } from 'express';
import vendorRoutes from './invoicivixVendor/vendor.route';
import engagementLetterRoutes from './invoicivixVendor/engagementLetter.route';
import legalDocumentRoutes from './invoicivixVendor/legalDocument.route';
import activityRateCardRoutes from './invoicivixVendor/activityRateCard.route';
import subVendorRoutes from './invoicivixVendor/subVendor.route';
import vendorAttorneyRoutes from './invoicivixVendor/vendorAttorney.route';
import vendorInvoiceRoutes from './invoicivixVendor/vendorInvoice.routes';
import paymentInfoRoutes from './invoicivixVendor/paymentInfo.route';
import purchaseOrderRoutes from './invoicivixVendor/purchaseOrder.routes';
import activityRoutes from './invoicivixVendor/activity.route';

const router = Router();


router.use('/vendor', vendorRoutes);
router.use('/engagement-letter', engagementLetterRoutes);
router.use('/legal-document', legalDocumentRoutes);
router.use('/activity-rate-card', activityRateCardRoutes);
router.use('/sub-vendor', subVendorRoutes);
router.use('/vendor-attorney', vendorAttorneyRoutes);
router.use('/vendor-invoice', vendorInvoiceRoutes);
router.use('/payment-info', paymentInfoRoutes);
router.use('/purchase-order', purchaseOrderRoutes);
router.use('/activity-info', activityRoutes);

export default router;
