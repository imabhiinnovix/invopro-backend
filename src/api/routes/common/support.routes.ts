import { Router } from 'express';
import {
  createSupportTicket,
  getSupportList,
  getSupportTicketById,
  updateSupportTicket,
  deleteSupportTicket,
} from '../../controllers/common/support.controller';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { roleAuthorization } from '../../../middlewares/role.middleware';
import { RoleId } from '../../../enums/role.enum';

const router = Router();

router.post('/create', authenticateToken, createSupportTicket);

// // Admin
router.get('/list', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN]), getSupportList);

router.get('/:supportId', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN]), getSupportTicketById);

router.post('/update/:supportId', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN]), updateSupportTicket);

router.post('/delete/:supportId', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN]), deleteSupportTicket);

export default router;
