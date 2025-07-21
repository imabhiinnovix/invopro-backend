import { Router } from 'express';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { createShare, getUsers, deleteShare } from '../../controllers/common/dashboardShare.controller';

const router = Router();

router.get('/list/:dashboardId', authenticateToken, getUsers);
router.post('/create', authenticateToken, createShare);
router.post('/:dashboardShareId', authenticateToken, deleteShare);

export default router;
