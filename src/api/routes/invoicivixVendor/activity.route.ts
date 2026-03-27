import { Router } from 'express';
import {
  createActivity,
  getActivityById,
  updateActivity,
  deleteActivity,
  getActivityList,
} from '../../controllers/invoicivixVendor/activity.controller';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { uploadMultipleFile } from '../../../middlewares/upload.middleware';

const router = Router();

router.get('/list', authenticateToken, getActivityList);

router.post(
  '/create',
  authenticateToken,
  uploadMultipleFile,
  createActivity
);

router.put(
  '/update/:activityId',
  authenticateToken,
  uploadMultipleFile,
  updateActivity
);

router.delete('/delete/:activityId', authenticateToken, deleteActivity);

router.get('/:activityId', authenticateToken, getActivityById);

export default router;