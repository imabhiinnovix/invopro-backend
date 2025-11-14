import { Router } from "express";

import { authenticateToken } from "../../../middlewares/authenticate.middleware";
import { permissionMiddleware } from "../../../middlewares/permission.middleware";
import { downloadRequestFile, listDownloadRequests } from "../../controllers/common/downloadRequest.controller";


const router = Router();

/**
 * LIST DOWNLOAD REQUESTS
 */
router.get(
  "/list",
  authenticateToken,
  permissionMiddleware(),
  listDownloadRequests
);

/**
 * DOWNLOAD GENERATED FILE
 */
router.get(
  "/download/:id",
  authenticateToken,
  permissionMiddleware(),
  downloadRequestFile
);

export default router;