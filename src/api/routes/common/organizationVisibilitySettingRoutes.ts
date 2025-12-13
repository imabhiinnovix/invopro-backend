import { Router } from "express";
import { authenticateToken } from "../../../middlewares/authenticate.middleware";
import { permissionMiddleware } from "../../../middlewares/permission.middleware";

import {
  createVisibilitySetting,
  updateVisibilitySetting,
  listVisibilitySettings,
  deleteVisibilitySetting
} from "../../controllers/common/organizationVisibilitySettingController";

const router = Router();

router.post("/create", authenticateToken, permissionMiddleware(), createVisibilitySetting);

router.put("/update/:settingId", authenticateToken, permissionMiddleware(), updateVisibilitySetting);

router.get("/list", authenticateToken, permissionMiddleware(), listVisibilitySettings);

router.delete("/delete/:settingId", authenticateToken, permissionMiddleware(), deleteVisibilitySetting);

export default router;