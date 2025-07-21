import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';

import {
  checkDataSourceCodeAvailableOrNot,
  checkDataSourceNameAvailableOrNot,
  createDataSourcce,
  getDataSourceById,
  getWidgetDataByFilter,
  listDataSource,
  updateDataSource,
} from '../../controllers/reportivix/dataSource.controller';

const router = Router();

router.get('/code/:code', authenticateToken, checkDataSourceCodeAvailableOrNot);
router.get('/name/:name', authenticateToken, checkDataSourceNameAvailableOrNot);

router.post('/create', authenticateToken, createDataSourcce);
router.put('/update/:dataSourceId', authenticateToken, updateDataSource);

router.get('/list', authenticateToken, listDataSource);
router.get('/dataSourceId/:dataSourceId', authenticateToken, getDataSourceById);
router.post('/getWidgetDataByFilter', authenticateToken, getWidgetDataByFilter);

export default router;
