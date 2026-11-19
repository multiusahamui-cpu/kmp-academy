import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import * as ra from "../controllers/roleApplicationController";

// Pengajuan naik peran oleh pengguna. Keputusan Admin ada di /admin/applications.
const router = Router();
router.use(authenticateToken);
router.get("/mine", ra.mine);
router.post("/", ra.apply);

export default router;
