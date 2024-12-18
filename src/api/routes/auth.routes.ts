import { Router } from 'express';

import { login, createUser, sendOtp, verifyOtp, resetPassword } from '../controllers/auth.controller';
import { authenticateToken } from '../../middlewares/authenticate.middleware';
import { roleAuthorization } from '../../middlewares/role.middleware';
import { RoleId } from '../../enums/role.enum';

const router = Router();

router.post('/login', login);

router.post('/create-user', authenticateToken, roleAuthorization([RoleId.SUPER_ADMIN, RoleId.ADMIN]), createUser);

// send-otp
router.post('/send-otp', sendOtp);

// verify-otp
router.post('/verify-otp', verifyOtp);

// reset password
router.post('/reset-password', resetPassword);

export default router;
