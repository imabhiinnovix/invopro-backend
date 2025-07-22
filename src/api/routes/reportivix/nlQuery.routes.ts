import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import {
  runNaturalLanguageAggregation,
  runNaturalLanguageInsights,
} from '../../controllers/reportivix/nlQuery.controller';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

const router = Router();

router.get('/getData', authenticateToken, permissionMiddleware(), runNaturalLanguageAggregation);
router.get('/insights', authenticateToken, permissionMiddleware(), runNaturalLanguageInsights);

export default router;
