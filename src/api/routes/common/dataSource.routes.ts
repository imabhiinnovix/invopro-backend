import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';

import {
  checkDataSourceCodeAvailableOrNot,
  checkDataSourceNameAvailableOrNot,
  createDataSourcce,
  exportWidgetDataByFilterToExcel,
  getDataSourceById,
  getDataSourceWithFieldOptionDetails,
  getWidgetDataByFilter,
  listDataSource,
  updateDataSource,
} from '../../controllers/common/dataSource.controller';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

const router = Router();

router.get('/code/:code', authenticateToken, permissionMiddleware(), checkDataSourceCodeAvailableOrNot);
router.get('/name/:name', authenticateToken, permissionMiddleware(), checkDataSourceNameAvailableOrNot);

router.post('/create', authenticateToken, permissionMiddleware(), createDataSourcce);
router.put('/update/:dataSourceId', authenticateToken, permissionMiddleware(), updateDataSource);

router.get('/list', authenticateToken, permissionMiddleware(), listDataSource);
router.get('/dataSourceId/:dataSourceId', authenticateToken, permissionMiddleware(), getDataSourceById);
router.post('/getWidgetDataByFilter', authenticateToken, permissionMiddleware(), getWidgetDataByFilter);
router.post('/getWidgetDataByFilter/export', authenticateToken, permissionMiddleware(), exportWidgetDataByFilterToExcel);
router.get(
  '/dataSourceDetails/:dataSourceId',
  authenticateToken,
  // permissionMiddleware(),
  getDataSourceWithFieldOptionDetails
);
router.get('/widget/plot-type-list', authenticateToken, permissionMiddleware(), listDataSource);

export default router;
