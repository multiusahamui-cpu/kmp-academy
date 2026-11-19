import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { uploadLimiter } from "../lib/security";
import * as kyc from "../controllers/kycController";

// KYC milik pengguna sendiri. Sisi Admin ada di /admin/kyc.
const router = Router();
router.use(authenticateToken);
router.get("/me", kyc.me);
router.post("/", uploadLimiter, kyc.kycUploadMiddleware, kyc.submit);
router.post("/import-digitalcoop", uploadLimiter, kyc.importDigitalcoop);

export default router;
