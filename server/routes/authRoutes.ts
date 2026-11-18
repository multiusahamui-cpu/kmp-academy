
import { Router } from "express";
import { register, login, logout, changePassword, getProfile, updateProfile, uploadAvatar, deleteAvatar, avatarUploadMiddleware, submitKYC, getKycStatus } from "../controllers/authController";
import { authenticateToken } from "../middleware/auth";
import { emailChangeLimiter, loginLimiter, passwordLimiter, registerLimiter, uploadLimiter } from "../lib/security";
import { getMyDeletion, requestDeletion, cancelDeletion } from "../controllers/accountDeletionController";
import { requestEmailChange, confirmEmailChange } from "../controllers/emailChangeController";
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

router.post("/email/request", authenticateToken, emailChangeLimiter, requestEmailChange);
router.post("/email/confirm", authenticateToken, emailChangeLimiter, confirmEmailChange);

router.get("/account-deletion", authenticateToken, getMyDeletion);
router.post("/account-deletion", authenticateToken, passwordLimiter, requestDeletion);
router.delete("/account-deletion", authenticateToken, cancelDeletion);

router.get("/me", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);
router.post("/profile/avatar", authenticateToken, uploadLimiter, avatarUploadMiddleware, uploadAvatar);
router.delete("/profile/avatar", authenticateToken, uploadLimiter, deleteAvatar);

router.post("/kyc", authenticateToken, submitKYC);
router.get("/kyc-status", authenticateToken, getKycStatus);

export default router;
