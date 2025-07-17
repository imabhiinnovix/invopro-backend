import { Router } from 'express';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { listDataSourceVersionErrorBasedOnDataSourceVersionId } from '../../controllers/reportivix/dataImportError.controller';

const router = Router();

router.get('/list', authenticateToken, listDataSourceVersionErrorBasedOnDataSourceVersionId);

export default router;
