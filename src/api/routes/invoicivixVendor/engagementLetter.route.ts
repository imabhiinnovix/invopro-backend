import { Router } from 'express';
import {
  createEngagementLetter,
  getEngagementLetterById,
  updateEngagementLetter,
  deleteEngagementLetter,
  getEngagementLetterList,
} from '../../controllers/invoicivixVendor/engagementLetter.controller';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';
import { uploadMultipleFile } from '../../../middlewares/upload.middleware';

const router = Router();

router.get('/list', 
    authenticateToken, 
    // permissionMiddleware(), 
    getEngagementLetterList
);

router.post(
  '/create',
  authenticateToken,
//   permissionMiddleware(),
  uploadMultipleFile,
  createEngagementLetter
);

router.put(
  '/update/:engagementLetterId',
  authenticateToken,
//   permissionMiddleware(),
  uploadMultipleFile,
  updateEngagementLetter
);

router.delete(
  '/delete/:engagementLetterId',
  authenticateToken,
//   permissionMiddleware(),
  deleteEngagementLetter
);

router.get('/:engagementLetterId', 
    authenticateToken, 
    // permissionMiddleware(), 
    getEngagementLetterById
);

export default router;