
import { Router } from "express";
import { register, login, logout, changePassword, getProfile, updateProfile, submitKYC, getKycStatus } from "../controllers/authController";
import { authenticateToken } from "../middleware/auth";
import { loginLimiter, passwordLimiter, registerLimiter } from "../lib/security";
import { getOnboarding, ssoDigitalcoop, submitOnboarding } from "../controllers/digitalcoopController";

const router = Router();

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/logout", logout);

// Masuk dari digitalcoop.id (tiket sekali pakai) + onboarding akun tertaut
router.post("/digitalcoop/sso", loginLimiter, ssoDigitalcoop);
router.get("/digitalcoop/onboarding", getOnboarding);
router.post("/digitalcoop/onboarding", passwordLimiter, submitOnboarding);

router.put("/password", authenticateToken, passwordLimiter, changePassword);

router.get("/me", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);

router.post("/kyc", authenticateToken, submitKYC);
router.get("/kyc-status", authenticateToken, getKycStatus);

export default router;
