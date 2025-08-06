import { Router } from 'express';
import notificationSettingRoutes from './notivix/notificationSetting.routes';

const router = Router();

router.use('/notification-setting', notificationSettingRoutes);


export default router;
