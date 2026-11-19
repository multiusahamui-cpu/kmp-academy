import { Router } from "express";
import * as mentor from "../controllers/mentorController";
import { authenticateToken } from "../middleware/auth";

// Sisi siswa untuk kelas Mentor: gabung dengan kode dan lihat kelas yang diikuti.
const router = Router();
router.use(authenticateToken);

router.get("/mine", mentor.myMemberships);
router.post("/join", mentor.joinByCode);

export default router;
