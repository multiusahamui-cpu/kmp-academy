import { Router } from "express";
import * as mentor from "../controllers/mentorController";
import * as workshop from "../controllers/workshopController";
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

// Workshop berbayar dari kursus mandiri
router.get("/workshops/eligible", workshop.eligibleCourses);
router.get("/workshops", workshop.myProposals);
router.post("/workshops", workshop.createProposal);
router.post("/workshops/:id/withdraw", workshop.withdrawProposal);
router.get("/earnings", workshop.mentorEarnings);

export default router;
