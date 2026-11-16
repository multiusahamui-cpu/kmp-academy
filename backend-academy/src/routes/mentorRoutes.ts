
import { Router } from "express";
import * as mentor from "../controllers/mentorController";
import { authenticateToken, requireRole } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);
router.use(requireRole(["MENTOR", "ADMIN_SYSTEM"])); 

router.get("/explorer", mentor.getExplorer);
router.get("/classes", mentor.getClasses);
router.get("/classes/:id/students", mentor.getClassStudents);

router.post("/proposals", mentor.createProposal);

router.put("/classes/:classId/grades", mentor.updateGrades);
router.post("/classes/:classId/schedule", mentor.setSchedule);
router.post("/classes/:classId/broadcast", mentor.broadcastMessage);

export default router;
