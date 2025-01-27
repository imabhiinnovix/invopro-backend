import { Router } from 'express';

import { authenticateToken } from '../../middlewares/authenticate.middleware';
import { checkDataSourceVersionNameAvailableOrNot } from '../controllers/dataSourceVersion.controller';

const router = Router();

router.get(
  '/dataSourceId/:dataSourceId/versionValue/:versionValue/versionName/:versionName',
  authenticateToken,
  checkDataSourceVersionNameAvailableOrNot
);

export default router;
