import { Router } from 'express';
import { authenticateToken } from '../../middlewares/authenticate.middleware';
import { create, getUsers } from '../controllers/transferDashboard.controller';

const router = Router();

router.get('/list/:dashboardId', authenticateToken, getUsers);
router.post('/create', authenticateToken, create);

export default router;
