// organization route function
import { Router } from 'express';
import {
  createOrganization,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
  getOrganizationList,
} from '../../controllers/common/organization.controller';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';

import { permissionMiddleware } from '../../../middlewares/permission.middleware';
import { uploadMultipleFile } from '../../../middlewares/upload.middleware';

const router = Router();

router.get('/list', authenticateToken, permissionMiddleware(), getOrganizationList);

router.post('/create', authenticateToken, permissionMiddleware(),uploadMultipleFile,  createOrganization);

router.put('/update/:organizationId', authenticateToken, permissionMiddleware(),uploadMultipleFile, updateOrganization);

router.delete('/delete/:organizationId', authenticateToken, permissionMiddleware(), deleteOrganization);

router.get('/get-current-organization', authenticateToken, getOrganizationById);

router.get('/:organizationId', authenticateToken, permissionMiddleware(), getOrganizationById);

export default router;
