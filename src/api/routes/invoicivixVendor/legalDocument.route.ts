import { Router } from 'express';
import {
  createLegalDocument,
  getLegalDocumentById,
  updateLegalDocument,
  deleteLegalDocument,
  getLegalDocumentList,
} from '../../controllers/invoicivixVendor/legalDocument.controller';

import { authenticateToken } from '../../../middlewares/authenticate.middleware';
import { permissionMiddleware } from '../../../middlewares/permission.middleware';
import { uploadMultipleFile } from '../../../middlewares/upload.middleware';

const router = Router();

router.get(
  '/list',
  authenticateToken,
//   permissionMiddleware(),
  getLegalDocumentList
);

router.post(
  '/create',
  authenticateToken,
//   permissionMiddleware(),
  uploadMultipleFile,
  createLegalDocument
);

router.put(
  '/update/:legalDocumentId',
  authenticateToken,
//   permissionMiddleware(),
  uploadMultipleFile,
  updateLegalDocument
);

router.delete(
  '/delete/:legalDocumentId',
  authenticateToken,
//   permissionMiddleware(),
  deleteLegalDocument
);

router.get(
  '/:legalDocumentId',
  authenticateToken,
//   permissionMiddleware(),
  getLegalDocumentById
);

export default router;