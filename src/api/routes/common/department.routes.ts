import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';

import { permissionMiddleware } from '../../../middlewares/permission.middleware';
import {
  createDepartment,
  deleteDepartment,
  getDepartmentList,
  updateDepartment,
} from '../../controllers/common/department.controller';

const router = Router();

router.post('/create', authenticateToken, permissionMiddleware(), createDepartment);
router.put('/update/:departmentId', authenticateToken, permissionMiddleware(), updateDepartment);
router.get('/list', authenticateToken, permissionMiddleware(), getDepartmentList);
router.delete('/delete/:departmentId', authenticateToken, permissionMiddleware(), deleteDepartment);

export default router;
