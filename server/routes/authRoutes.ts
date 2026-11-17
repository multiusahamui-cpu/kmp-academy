
import { Router } from "express";
import { register, login, logout, getProfile, updateProfile, submitKYC, getKycStatus } from "../controllers/authController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", authenticateToken, logout);

router.get("/me", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);

router.post("/kyc", authenticateToken, submitKYC);
router.get("/kyc-status", authenticateToken, getKycStatus);

export default router;
