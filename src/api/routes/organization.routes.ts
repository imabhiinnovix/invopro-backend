// organization route function
import { Router } from 'express';
import {
  createOrganization,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
  getOrganizationList,
  updateOrganizationStatus,
} from '../controllers/organization.controller';
import { authenticateToken } from '../../middlewares/authenticate.middleware';
import { roleAuthorization } from '../../middlewares/role.middleware';
import { RoleId } from '../../enums/role.enum';

const router = Router();

// Admin
router.get('/list', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]), getOrganizationList);

router.get(
  '/:organizationId',
  authenticateToken,
  roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]),
  getOrganizationById
);

router.post('/create', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN]), createOrganization);

router.post('/update/:organizationId', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN]), updateOrganization);

router.post(
  '/updateStatus/:organizationId',
  authenticateToken,
  roleAuthorization([RoleId.SUPER_ADMIN]),
  updateOrganizationStatus
);

router.post('/delete/:organizationId', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN]), deleteOrganization);

export default router;
