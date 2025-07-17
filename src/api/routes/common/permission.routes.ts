import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { roleAuthorization } from '../../../middlewares/role.middleware';
import { RoleId } from '../../../enums/role.enum';
import { getPermissionList } from '../../controllers/common/permission.controller';

const router = Router();

router.get('/list', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN]), getPermissionList);

export default router;
