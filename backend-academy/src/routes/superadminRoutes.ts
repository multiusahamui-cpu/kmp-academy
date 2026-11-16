
import { Router } from "express";
import { getServerHealthFull, toggleMaintenance, assignRole, updatePolicy } from "../controllers/superadminController";
import { authenticateToken, requireRole } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);
router.use(requireRole(["SUPERADMIN"])); // Strictly Superadmin

router.get("/health", getServerHealthFull);
router.post("/maintenance", toggleMaintenance);
router.put("/roles/assign", assignRole);
router.put("/policy", updatePolicy);

export default router;
