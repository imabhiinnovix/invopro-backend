import { Router } from 'express';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { listDataSourceVersionErrorBasedOnDataSourceVersionId } from '../../controllers/common/dataImportError.controller';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

const router = Router();

router.get('/list', authenticateToken, permissionMiddleware(), listDataSourceVersionErrorBasedOnDataSourceVersionId);

export default router;
