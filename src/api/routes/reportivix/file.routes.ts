import express from 'express';

import { handleFileUpload } from '../../controllers/reportivix/file.controller';
import { uploadMultipleFile } from '../../../middlewares/upload.middleware';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';

const router = express.Router();

router.post('/upload', authenticateToken, uploadMultipleFile, handleFileUpload);

export default router;
