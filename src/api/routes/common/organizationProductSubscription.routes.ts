import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { roleAuthorization } from '../../../middlewares/role.middleware';
import { RoleId } from '../../../enums/role.enum';
import { getOrganizationProductSubscription } from '../../controllers/common/organizationProductSubscription.controller';

const router = Router();

router.get('/list', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN]), getOrganizationProductSubscription);

export default router;
