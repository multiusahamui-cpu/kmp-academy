import { Router } from "express";
import * as mentor from "../controllers/mentorController";
import { authenticateToken, requireRole } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);
router.use(requireRole(["MENTOR"]));

router.get("/classes", mentor.getClasses);
router.post("/classes", mentor.createClass);
router.get("/classes/:id", mentor.getClass);
router.put("/classes/:id", mentor.updateClass);
router.post("/classes/:id/code", mentor.regenerateCode);
router.post("/classes/:id/members", mentor.addMember);
router.delete("/classes/:id/members/:userId", mentor.removeMember);
router.put("/classes/:id/members/:userId/grade", mentor.setGrade);
router.post("/classes/:id/sessions", mentor.addSession);
router.delete("/classes/:id/sessions/:sessionId", mentor.deleteSession);

export default router;
