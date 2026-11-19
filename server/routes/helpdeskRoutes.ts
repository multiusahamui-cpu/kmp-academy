import { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import * as h from "../controllers/helpdeskController";

const router = Router();
router.use(authenticateToken);

router.post("/", h.createTicket);
router.get("/mine", h.listMine);
router.get("/", requireRole(["ADMIN_SYSTEM", "SUPERADMIN"]), h.listAll);
router.get("/:id", h.getTicket);
router.post("/:id/messages", h.addMessage);
router.put("/:id/close", h.closeTicket);

export default router;
