import { Router } from "express";
import {
  login,
  signup,
  bootstrapStatus,
  refresh,
  logout,
  me,
  verifyEmail,
  resendVerification,
  loginSchema,
  signupSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from "../controllers/authController.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/bootstrap-status", bootstrapStatus);
router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/verify-email", validate(verifyEmailSchema), verifyEmail);
router.post("/resend-verification", validate(resendVerificationSchema), resendVerification);
router.get("/me", authenticate, me);

export default router;
