import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import {
  runNaturalLanguageAggregation,
  runNaturalLanguageInsights,
} from '../../controllers/reportivix/nlQuery.controller';

const router = Router();

router.get('/getData', authenticateToken, runNaturalLanguageAggregation);
router.get('/insights', authenticateToken, runNaturalLanguageInsights);

export default router;
