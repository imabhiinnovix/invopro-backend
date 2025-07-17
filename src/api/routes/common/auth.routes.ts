import { Router } from 'express';

import { login, createUser, sendOtp, verifyOtp, resetPassword } from '../../controllers/common/auth.controller';
import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { roleAuthorization } from '../../../middlewares/role.middleware';
import { RoleId } from '../../../enums/role.enum';

const router = Router();

router.post('/login', login);

// send-otp
router.post('/send-otp', sendOtp);

// verify-otp
router.post('/verify-otp', verifyOtp);

// reset password
router.post('/reset-password', resetPassword);

export default router;
