import { Router } from "express";
import { getFabricOptions } from "../controllers/fabricOptionsController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, getFabricOptions);

export default router;
