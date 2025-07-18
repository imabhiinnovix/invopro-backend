import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { roleAuthorization } from '../../../middlewares/role.middleware';
import { RoleId } from '../../../enums/role.enum';
import { getProductList } from '../../controllers/common/product.controller';

const router = Router();

router.get('/list', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN]), getProductList);

export default router;
