import { Router } from 'express';
import {
  createActivityRateCard,
  getActivityRateCardById,
  updateActivityRateCard,
  deleteActivityRateCard,
  getActivityRateCardList,
} from '../../controllers/invoicivixVendor/activityRateCard.controller';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

const router = Router();

router.get(
  '/list',
  authenticateToken,
  // permissionMiddleware(),
  getActivityRateCardList
);

router.post(
  '/create',
  authenticateToken,
  // permissionMiddleware(),
  createActivityRateCard
);

router.put(
  '/update/:activityRateCardId',
  authenticateToken,
  // permissionMiddleware(),
  updateActivityRateCard
);

router.delete(
  '/delete/:activityRateCardId',
  authenticateToken,
  // permissionMiddleware(),
  deleteActivityRateCard
);

router.get(
  '/:activityRateCardId',
  authenticateToken,
  // permissionMiddleware(),
  getActivityRateCardById
);

export default router;