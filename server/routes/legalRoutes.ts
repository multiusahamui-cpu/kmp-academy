import { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import * as legal from "../controllers/legalController";

const router = Router();

// Publik: versi berlaku semua dokumen yang sudah terbit (untuk tautan di halaman pendaftaran/footer).
router.get("/public", legal.getPublicDocs);

router.use(authenticateToken);
router.get("/pending", legal.getPending);
router.post("/accept", legal.accept);

const manage = requireRole(["DIRECTOR", "SUPERADMIN"]);
router.get("/admin", manage, legal.listDocs);
router.post("/admin", manage, legal.createDraft);
router.get("/admin/:id", manage, legal.getDoc);
router.put("/admin/:id", manage, legal.updateDraft);
router.post("/admin/:id/publish", requireRole(["DIRECTOR"]), legal.publishDoc);

export default router;
