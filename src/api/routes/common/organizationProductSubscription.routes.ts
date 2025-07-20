import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { getOrganizationProductSubscription } from '../../controllers/common/organizationProductSubscription.controller';

const router = Router();

router.get('/list', authenticateToken, getOrganizationProductSubscription);

export default router;
