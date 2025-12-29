import { Router } from 'express';

import { login, sendOtp, verifyOtp, resetPassword, assumeOrRevertSession } from '../../controllers/common/auth.controller';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { RoleId } from '../../../enums/role.enum';
import { roleTypeAuthorization } from '../../../middlewares/roleType.middleware';

const router = Router();

router.post('/login', login);

// send-otp
router.post('/send-otp', sendOtp);

// verify-otp
router.post('/verify-otp', verifyOtp);

// reset password
router.post('/reset-password', resetPassword);

router.post(
  '/assume-session',
  authenticateToken,
  roleTypeAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]),
  assumeOrRevertSession
);

export default router;
