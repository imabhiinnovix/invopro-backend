import { Router } from 'express';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

import {
  uploadCentralFile,
  getCentralFileList,
  getLatestCentralFiles,
  revalidateCentralFile,
  exportValidatedCentralFileToExcel,
  getFolderYearMonthSummary, // ✅ ADD THIS
} from '../../controllers/common/centralFile.controller';

import { uploadMultipleFile } from '../../../middlewares/upload.middleware';

const router = Router();

router.post('/upload', authenticateToken, /*permissionMiddleware(),*/ uploadMultipleFile, uploadCentralFile);
router.get('/list', authenticateToken, /*permissionMiddleware(),*/ getCentralFileList);
router.get('/latest', authenticateToken, /*permissionMiddleware(),*/ getLatestCentralFiles);
router.get('/download', authenticateToken, /*permissionMiddleware(),*/ exportValidatedCentralFileToExcel);
router.get(
  '/folder-summary',
  authenticateToken,
  getFolderYearMonthSummary
);

// ✅ REVALIDATE CENTRAL FILE
router.put(
  '/revalidate/:centralFileId',
  authenticateToken,
  // permissionMiddleware(),
  revalidateCentralFile
);

export default router;