import { Router } from 'express';
import {
  createOperator,
  getOperatorById,
  getOperators,
  updateOperator,
} from '../../controllers/common/operator.controller';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';

const router = Router();

router.get('/get/:operatorId', authenticateToken, getOperatorById);
router.post('/list', authenticateToken, getOperators);
router.post('/update/:operatorId', authenticateToken, updateOperator);
router.post('/create', authenticateToken, createOperator);

export default router;
