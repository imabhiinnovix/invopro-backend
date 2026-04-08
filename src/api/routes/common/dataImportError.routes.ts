import { Router } from 'express';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import {
  getErrorRowDataBasedOnDataSourceVersionIdAndRowNumber,
  listDataSourceVersionErrorBasedOnDataSourceVersionId,
  resolveDataImportError,
  getImportDataSourceVersionData,
  updateImportData
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

router.get(
  '/import-data',
  authenticateToken,
  //   permissionMiddleware(),
  getImportDataSourceVersionData
);

router.put(
  '/update-import-data',
  authenticateToken,
  //   permissionMiddleware(),
  updateImportData
);
export default router;
