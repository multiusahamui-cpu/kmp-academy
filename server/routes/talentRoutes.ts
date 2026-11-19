import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { talentBrowseLimiter, talentInquiryLimiter } from "../lib/security";
import * as talent from "../controllers/talentController";

// Industry Hub. Publik: direktori dan profil (tanpa kontak), kirim pesan. Pemilik: /talent/me (login).
const router = Router();
router.get("/me", authenticateToken, talent.myProfile);
router.put("/me", authenticateToken, talent.saveMyProfile);
router.post("/me/hide", authenticateToken, talent.hideMyProfile);
router.get("/", talentBrowseLimiter, talent.directory);
router.get("/:slug", talentBrowseLimiter, talent.publicProfile);
router.post("/:slug/inquiries", talentInquiryLimiter, talent.sendInquiry);

export default router;
