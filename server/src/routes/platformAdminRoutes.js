import { Router } from "express";
import { authenticatePlatformAdmin } from "../middleware/auth.js";
import {
  listOrgs, getOrg, suspendOrg, activateOrg,
  listUsers, platformStats,
} from "../platform/platformAdminController.js";

const router = Router();
router.use(authenticatePlatformAdmin);

router.get("/stats",         platformStats);
router.get("/orgs",          listOrgs);
router.get("/orgs/:id",      getOrg);
router.patch("/orgs/:id/suspend",  suspendOrg);
router.patch("/orgs/:id/activate", activateOrg);
router.get("/users",         listUsers);

export default router;
