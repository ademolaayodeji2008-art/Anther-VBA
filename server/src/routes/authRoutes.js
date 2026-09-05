import { Router } from "express";
import {
  signup, signupSchema,
  login, loginSchema,
  selectOrg, selectOrgSchema,
  refresh,
  logout,
  me,
  myOrgs,
  verifyEmail, verifyEmailSchema,
  resendVerification, resendVerificationSchema,
  bootstrapStatus,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// Public
router.get("/bootstrap-status", bootstrapStatus);
router.post("/signup",               validate(signupSchema),               signup);
router.post("/login",                validate(loginSchema),                login);
router.post("/select-org",           validate(selectOrgSchema),            selectOrg);
router.post("/refresh",              refresh);
router.post("/logout",               logout);
router.post("/verify-email",         validate(verifyEmailSchema),          verifyEmail);
router.post("/resend-verification",  validate(resendVerificationSchema),   resendVerification);

// Protected
router.get("/me",   authenticate, me);
router.get("/orgs", authenticate, myOrgs);

export default router;
