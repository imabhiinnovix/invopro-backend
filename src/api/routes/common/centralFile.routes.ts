import { Router } from 'express';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

import {
  uploadCentralFile,
  getCentralFileList,
  getLatestCentralFiles,
} from '../../controllers/common/centralFile.controller';
import { uploadMultipleFile } from '../../../middlewares/upload.middleware';

const router = Router();

router.post('/upload', authenticateToken, permissionMiddleware(), uploadMultipleFile, uploadCentralFile);
router.get('/list', authenticateToken, permissionMiddleware(), getCentralFileList);
router.get('/latest', authenticateToken, permissionMiddleware(), getLatestCentralFiles);

export default router;