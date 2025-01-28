import { Router } from 'express';

import { authenticateToken } from '../../middlewares/authenticate.middleware';
import {
  checkDataSourceVersionNameAvailableOrNot,
  listDataSourceVersion,
} from '../controllers/dataSourceVersion.controller';

const router = Router();

router.get('/list', authenticateToken, listDataSourceVersion);

router.get(
  '/dataSourceId/:dataSourceId/versionValue/:versionValue/versionName/:versionName',
  authenticateToken,
  checkDataSourceVersionNameAvailableOrNot
);

export default router;
