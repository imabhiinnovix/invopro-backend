import { Router } from 'express';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';

import {
  createDerivedField,
  updateDerivedField,
  deleteDerivedField,
  listDerivedFields,
  getDerivedFieldById,
} from '../../controllers/common/derivedField.controller';

const router = Router();

router.post('/create', authenticateToken, createDerivedField);
router.put('/update/:id', authenticateToken, permissionMiddleware(), updateDerivedField);
router.delete('/delete/:id', authenticateToken, permissionMiddleware(), deleteDerivedField);
router.get('/list', authenticateToken, permissionMiddleware(), listDerivedFields);
router.get('/:id', authenticateToken, permissionMiddleware(), getDerivedFieldById);

export default router;
