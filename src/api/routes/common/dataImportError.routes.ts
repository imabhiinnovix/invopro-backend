import { Router } from 'express';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import {
  getErrorRowDataBasedOnDataSourceVersionIdAndRowNumber,
  listDataSourceVersionErrorBasedOnDataSourceVersionId,
  resolveDataImportError,
} from '../../controllers/common/dataImportError.controller';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

const router = Router();

router.get('/list', authenticateToken, permissionMiddleware(), listDataSourceVersionErrorBasedOnDataSourceVersionId);
router.post(
  '/resolve',
  authenticateToken,
  //   permissionMiddleware(),
  resolveDataImportError
);

router.get(
  '/data',
  authenticateToken,
  //   permissionMiddleware(),
  getErrorRowDataBasedOnDataSourceVersionIdAndRowNumber
);
export default router;
