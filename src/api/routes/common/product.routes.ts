import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';

import { getProductList } from '../../controllers/common/product.controller';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

const router = Router();

router.get('/list', authenticateToken, permissionMiddleware(), getProductList);

export default router;
