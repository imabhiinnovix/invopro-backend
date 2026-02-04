import { Router } from 'express';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

import {
  listCentralFileErrors,
  resolveCentralFileImportError,
  getCentralFileRowData,
} from '../../controllers/common/dataImportCentralFileError.controller';

const router = Router();

/**
 * ✅ LIST CENTRAL FILE ERRORS (with search, filters, export)
 * GET /central-file-error/list
 */
router.get(
  '/list',
  authenticateToken,
  // permissionMiddleware(),
  listCentralFileErrors
);

/**
 * ✅ RESOLVE CENTRAL FILE ERRORS (discard, update, submit, unique, addOption, discardAllSubmit)
 * POST /central-file-error/resolve
 */
router.post(
  '/resolve',
  authenticateToken,
  // permissionMiddleware(), // enable if required
  resolveCentralFileImportError
);

/**
 * ✅ GET CENTRAL FILE ROW DATA (resolved entity references)
 * GET /central-file-error/data
 */
router.get(
  '/data',
  authenticateToken,
  // permissionMiddleware(), // enable if required
  getCentralFileRowData
);

export default router;