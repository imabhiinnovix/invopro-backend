import { Router } from 'express';
import {
  createOperator,
  getOperatorById,
  getOperators,
  updateOperator,
} from '../../controllers/common/operator.controller';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

const router = Router();

router.get('/get/:operatorId', authenticateToken, permissionMiddleware(), getOperatorById);
router.post('/list', authenticateToken, permissionMiddleware(), getOperators);
router.post('/update/:operatorId', authenticateToken, permissionMiddleware(), updateOperator);
router.post('/create', authenticateToken, permissionMiddleware(), createOperator);

export default router;
