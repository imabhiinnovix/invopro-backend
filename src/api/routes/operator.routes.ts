import { Router } from 'express';
import { createOperator, getOperatorById, getOperators, updateOperator } from '../controllers/operator.controller';

const router = Router();

router.post('/create', createOperator);
router.post('/update/:operatorId', updateOperator);
router.get('/get/:operatorId', getOperatorById);
router.get('/list', getOperators);

export default router;
