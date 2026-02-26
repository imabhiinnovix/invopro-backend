import { Router } from 'express';
import vendorRoutes from './invoicivixVendor/vendor.route';


const router = Router();


router.use('/vendor', vendorRoutes);

export default router;
