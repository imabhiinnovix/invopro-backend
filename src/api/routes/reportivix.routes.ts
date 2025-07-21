import { Router } from 'express';

import customReports from './reportivix/customReport.routes';

import nlQueryRoutes from './reportivix/nlQuery.routes';
// import widgetAppearanceRoutes from './WidgetAppearance';

const router = Router();

router.use('/customReports', customReports);

router.use('/nlQuery', nlQueryRoutes);
// router.use('/widgetAppearances', widgetAppearanceRoutes);

export default router;
