import { Router } from 'express';
import { authenticateToken } from '../../middlewares/authenticate.middleware';
import { create } from '../controllers/transferDashboard.controller';

const router = Router();

router.post('/create', authenticateToken, create);

export default router;
