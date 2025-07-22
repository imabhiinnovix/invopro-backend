import { Router } from 'express';

import {
  getAllWidgetAppearance,
  createWidgetAppearance,
  updateWidgetAppearance,
  deleteWidgetAppearance,
  getWidgetAppearanceById,
} from '../../controllers/common/widgetAppearance.controller';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';

const router = Router();

router.get('/list', authenticateToken, getAllWidgetAppearance);
router.get('/:widgetAppearanceid', authenticateToken, getWidgetAppearanceById);
router.post('/create', authenticateToken, createWidgetAppearance);
router.put('/update/:widgetAppearanceid', authenticateToken, updateWidgetAppearance);
router.delete('/delete/:widgetAppearanceid', authenticateToken, deleteWidgetAppearance);

export default router;
