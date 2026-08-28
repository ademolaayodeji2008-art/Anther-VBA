import { Router } from "express";
import {
  listAssets,
  getAsset,
  createAssetHandler,
  updateAsset,
  deleteAsset,
  createAssetSchema,
  updateAssetSchema,
} from "../controllers/assetController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(authenticate);
router.get("/", listAssets);
router.get("/:id", getAsset);
router.post("/", requirePermission("assets:manage"), validate(createAssetSchema), createAssetHandler);
router.patch("/:id", requirePermission("assets:manage"), validate(updateAssetSchema), updateAsset);
router.delete("/:id", requirePermission("assets:manage"), deleteAsset);

export default router;
